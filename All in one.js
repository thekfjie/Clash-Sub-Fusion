// 双订阅智能分流脚本
// 功能：主力节点负责 AI，廉价节点负责下载与杂项。

function main(config) {

  // =================================================
  // 1. 资源配置 (外部订阅接入)
  // =================================================
  
  // [注意] 请将下方的地址替换为你的 "备用/廉价" 订阅链接
  const cheapUrl = "YOUR_SUBSCRIPTION_URL_HERE"; 
  
  if (!config['proxy-providers']) {
    config['proxy-providers'] = {};
  }

  // 定义备用订阅源
  config['proxy-providers']['Cheap-Provider'] = {
    "type": "http",
    "url": cheapUrl,
    "interval": 3600,
    "path": "./proxies/cheap.yaml",
    "health-check": {
      "enable": true,
      "interval": 600,
      "url": "http://www.gstatic.com/generate_204"
    },
    // 正则过滤：只保留 港/台/美 等常用地区
    "filter": "(?i)(港|HK|Hong|台|TW|Tai|美|US|States|America)" 
  };

  // 提取当前配置文件中的节点 (作为主力/优质节点)
  const premiumNodes = config.proxies.map(p => p.name);

  // =================================================
  // 2. 核心引擎 (测速与分流)
  // =================================================

  // 引擎 A: 优质自动 (主力订阅全量)
  const autoPremium = {
    "name": "⚡ 优质自动",
    "type": "url-test",
    "url": "http://www.gstatic.com/generate_204",
    "interval": 300,
    "tolerance": 50,
    "proxies": premiumNodes
  };

  // 引擎 B: 廉价自动 (备用订阅全量)
  const autoCheap = {
    "name": "🐱 廉价自动",
    "type": "url-test",
    "url": "http://www.gstatic.com/generate_204",
    "interval": 300,
    "tolerance": 50,
    "use": ["Cheap-Provider"]
  };

  // 引擎 C: 主力区域分流 (为 AI 准备)
  function createRegionAuto(name, regex) {
    // 从主力节点中筛选符合正则的节点
    const nodes = premiumNodes.filter(n => regex.test(n));
    return {
      "name": name,
      "type": "url-test",
      "url": "http://www.gstatic.com/generate_204",
      "interval": 300,
      // 如果找不到该地区节点，自动回退到直连
      "proxies": nodes.length > 0 ? nodes : ["DIRECT"]
    };
  }

  const usAuto = createRegionAuto("🇺🇸 US 自动", /(美国|美國|US|States|America)/i);
  const sgAuto = createRegionAuto("🇸🇬 SG 自动", /(新加坡|獅城|Singapore|SG)/i);
  const jpAuto = createRegionAuto("🇯🇵 JP 自动", /(日本|JP|Japan)/i);
  const krAuto = createRegionAuto("🇰🇷 KR 自动", /(韩国|韓|Korea|KR|Seoul)/i);

  // =================================================
  // 3. 面板策略组 (用户操作界面)
  // =================================================

  // [总控] 节点选择
  // 作用：手动控制主力，也是 "漏网之鱼" 的备用靠山
  const proxyGroup = {
    "name": "🚀 节点选择",
    "type": "select",
    "proxies": [
      "⚡ 优质自动",
      "🐱 廉价自动",
      "DIRECT"
    ],
    "use": ["Cheap-Provider"] 
  };
  proxyGroup.proxies = proxyGroup.proxies.concat(premiumNodes);

  // [AI] AI 专线 (主力订阅独占)
  const aiGroup = {
    "name": "🤖 AI 专线",
    "type": "select",
    "proxies": [
      "🇺🇸 US 自动", 
      "🇸🇬 SG 自动",
      "🇯🇵 JP 自动",
      "🇰🇷 KR 自动", 
      "🚀 节点选择" 
    ]
  };

  // [下载] 下载模式 (备用订阅主力)
  const downloadGroup = {
    "name": "⬇️ 下载模式",
    "type": "select",
    "proxies": [
      "🐱 廉价自动", 
      "⚡ 优质自动",
      "🚀 节点选择",
      "DIRECT"
    ],
    "use": ["Cheap-Provider"] 
  };

  // [国内] 国内连接
  const cnGroup = {
    "name": "🇨🇳 国内连接",
    "type": "select",
    "proxies": ["DIRECT", "🚀 节点选择"]
  };

  // [兜底] 漏网之鱼 (杂项流量)
  const finalGroup = {
    "name": "🐟 漏网之鱼",
    "type": "select",
    "proxies": [
      "🐱 廉价自动",  // 默认走廉价省流
      "🚀 节点选择",  // 备选手动接管
      "⚡ 优质自动",
      "DIRECT"
    ]
  };

  // 写入分组 (面板显示顺序)
  config['proxy-groups'] = [
    aiGroup,       
    downloadGroup, 
    proxyGroup,    
    finalGroup,    
    cnGroup,       
    // 隐藏的测速组
    autoPremium,
    autoCheap,
    usAuto,
    sgAuto,
    jpAuto,
    krAuto         
  ];

  // =================================================
  // 4. 规则构建
  // =================================================

  const customRules = [
    // === 0. 强制直连 (游戏/音乐) ===
    "PROCESS-NAME,MoeKoe Music.exe,DIRECT",
    "DOMAIN,kugou.com,DIRECT",
    "DOMAIN,msftncsi.com,DIRECT",
    "DOMAIN,www.msftncsi.com,DIRECT",
    "PROCESS-NAME,cs2.exe,DIRECT",
    "PROCESS-NAME,dota2.exe,DIRECT",
    "PROCESS-NAME,steam.exe,DIRECT",

    // === 1. AI 核心区 (强制走主力) ===
    // Google AI / DeepMind
    "DOMAIN-SUFFIX,gemini.google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,bard.google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,deepmind.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,deepmind.google,🤖 AI 专线",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,antigravity-unleash.goog,🤖 AI 专线",
    "DOMAIN-SUFFIX,app-analytics-services.com,🤖 AI 专线",
    "GEOSITE,google-deepmind,🤖 AI 专线",
    // Google 资源强制跟随 AI (防封号)
    "DOMAIN-SUFFIX,googleusercontent.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,gstatic.com,🤖 AI 专线", 
    
    // OpenAI / Microsoft AI / Claude
    "DOMAIN-SUFFIX,openai.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,chatgpt.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,oaistatic.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,bing.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,copilot.microsoft.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,anthropic.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,claude.ai,🤖 AI 专线",

    // === 2. 下载区 (强制走备用) ===
    // GitHub
    "DOMAIN-SUFFIX,github.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,githubusercontent.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,github.io,⬇️ 下载模式",
    
    // Steam
    "PROCESS-NAME,steamwebhelper.exe,⬇️ 下载模式",
    "DOMAIN-SUFFIX,steamserver.net,⬇️ 下载模式",
    "DOMAIN-SUFFIX,steamcontent.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,steampowered.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,steamstatic.com,⬇️ 下载模式",
    "GEOSITE,steam@cn,⬇️ 下载模式",
    
    // Epic
    "DOMAIN-SUFFIX,epicgames.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,unrealengine.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,helpshift.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,paragon.com,⬇️ 下载模式",
    "DOMAIN-SUFFIX,epicgames-download1.akamaized.net,⬇️ 下载模式",
    "DOMAIN-SUFFIX,epicgames-download,⬇️ 下载模式",
    "DOMAIN-SUFFIX,d-epicgames,⬇️ 下载模式",
    "DOMAIN-SUFFIX,egdownload.fastly-edge.com,⬇️ 下载模式",
    "DOMAIN,connect.epicgames.dev,⬇️ 下载模式",
    "DOMAIN,launcher-public-service-prod06.ol.epicgames.com,⬇️ 下载模式",
    
    // === 3. Google 主站 (跟随 AI) ===
    "DOMAIN-SUFFIX,google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,youtube.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,ytimg.com,🤖 AI 专线",
    "DOMAIN-KEYWORD,google,🤖 AI 专线",

    // === 4. 默认兜底 ===
    "GEOIP,CN,🇨🇳 国内连接",
    "GEOSITE,CN,🇨🇳 国内连接",
    // 漏网之鱼 -> 默认走廉价自动
    "MATCH,🐟 漏网之鱼"
  ];
  config.rules = customRules;

  return config;
}
