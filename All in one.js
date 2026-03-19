// 【All in one V3 - Unified】
// 双订阅智能分流脚本
// 功能：主力节点负责 AI，廉价节点负责下载与杂项。跨平台统一版本。

function main(config) {

  // =================================================
  // 1. 资源配置
  // =================================================
  // [⚠️注意] 请将下方的地址替换为你的 "备用/廉价" 订阅链接
  const cheapUrl = "YOUR_SUBSCRIPTION_URL_HERE";

  if (!config['proxy-providers']) {
    config['proxy-providers'] = {};
  }

  // 廉价节点池
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
    "filter": "(?i)(港|HK|Hong|台|TW|Tai|美|US|States|America|韩|Korea)" 
  };

  // 提取主力节点
  const premiumNodes = config.proxies.map(p => p.name);

  // =================================================
  // 2. 核心引擎
  // =================================================

  // 引擎 A: 优质自动 (主力订阅)
  const autoPremium = {
    "name": "⚡ 优质自动",
    "type": "url-test",
    "url": "http://www.gstatic.com/generate_204",
    "interval": 300,
    "tolerance": 50,
    "proxies": premiumNodes
  };

  // 引擎 B: 廉价自动 (备用订阅)
  const autoCheap = {
    "name": "🐱 廉价自动",
    "type": "url-test",
    "url": "http://www.gstatic.com/generate_204",
    "interval": 300,
    "tolerance": 50,
    "use": ["Cheap-Provider"]
  };

  // 引擎 C: 区域自动 (AI用，基于主力节点)
  function createRegionAuto(name, regex) {
    const nodes = premiumNodes.filter(n => regex.test(n));
    return {
      "name": name,
      "type": "url-test",
      "url": "http://www.gstatic.com/generate_204",
      "interval": 300,
      "proxies": nodes.length > 0 ? nodes : ["DIRECT"]
    };
  }

  const usAuto = createRegionAuto("🇺🇸 US 自动", /(美国|美國|US|States|America)/i);
  const sgAuto = createRegionAuto("🇸🇬 SG 自动", /(新加坡|獅城|Singapore|SG)/i);
  const jpAuto = createRegionAuto("🇯🇵 JP 自动", /(日本|JP|Japan)/i);
  const krAuto = createRegionAuto("🇰🇷 KR 自动", /(韩国|韓|Korea|KR|Seoul)/i);

  // =================================================
  // 3. 面板策略组
  // =================================================

  // [总控] 节点选择
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

  // [游戏] 🎮 游戏商店
  const gameGroup = {
    "name": "🎮 游戏商店",
    "type": "select",
    "proxies": [
      "🐱 廉价自动", // 默认走廉价
      "⚡ 优质自动",
      "🚀 节点选择",
      "DIRECT"
    ]
  };

  // [AI] AI 专线
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

  // [GitHub] GitHub 专区
  const githubGroup = {
    "name": "⬇️ GitHub",
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

  // [兜底] 漏网之鱼
  const finalGroup = {
    "name": "🐟 漏网之鱼",
    "type": "select",
    "proxies": [
      "🐱 廉价自动",
      "🚀 节点选择",
      "⚡ 优质自动",
      "DIRECT"
    ]
  };

  // 写入分组
  config['proxy-groups'] = [
    aiGroup,       
    gameGroup,     
    githubGroup,
    proxyGroup,    
    finalGroup,    
    cnGroup,       
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
    // === 0. 强制直连 (常规) ===
    "PROCESS-NAME,MoeKoe Music.exe,DIRECT",
    "DOMAIN,kugou.com,DIRECT",
    "DOMAIN,msftncsi.com,DIRECT",
    "DOMAIN,www.msftncsi.com,DIRECT",
    "DOMAIN-SUFFIX,aliyun.com,DIRECT",

    // === 1. 游戏下载/CDN (强制直连) ===
    // Steam 下载
    "DOMAIN-SUFFIX,steamserver.net,DIRECT", 
    "GEOSITE,steam@cn,DIRECT",
    
    // Epic 下载
    "DOMAIN,connect.epicgames.dev,DIRECT",
    "DOMAIN,launcher-public-service-prod06.ol.epicgames.com,DIRECT",
    "DOMAIN-SUFFIX,epicgames-download1.akamaized.net,DIRECT",
    "DOMAIN-SUFFIX,epicgames-download,DIRECT",
    "DOMAIN-SUFFIX,d-epicgames,DIRECT",
    "DOMAIN-SUFFIX,egdownload.fastly-edge.com,DIRECT",

    // 游戏进程直连
    "PROCESS-NAME,cs2.exe,DIRECT",
    "PROCESS-NAME,dota2.exe,DIRECT",
    "PROCESS-NAME,steam.exe,DIRECT",

    // === 2. 游戏商店 (走专用分组) ===
    // Steam 商店/社区
    "PROCESS-NAME,steamwebhelper.exe,🎮 游戏商店", 
    "DOMAIN-SUFFIX,steampowered.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,steamcommunity.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,steamgames.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,steamusercontent.com,🎮 游戏商店",
    
    // Epic 商店
    "DOMAIN-SUFFIX,epicgames.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,unrealengine.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,helpshift.com,🎮 游戏商店",
    "DOMAIN-SUFFIX,paragon.com,🎮 游戏商店",

    // === 3. 特殊路由 ===
    "DOMAIN-SUFFIX,kitty.su,🐱 廉价自动",

    // === 4. AI 核心区 ===
    "PROCESS-NAME,Antigravity.exe,🤖 AI 专线",
    "PROCESS-NAME,opencode-cli.exe,🤖 AI 专线",
    "PROCESS-NAME,OpenCode.exe,🤖 AI 专线",
    "DOMAIN-SUFFIX,gemini.google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,bard.google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,deepmind.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,deepmind.google,🤖 AI 专线",
    "DOMAIN-SUFFIX,play.googleapis.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,antigravity-unleash.goog,🤖 AI 专线",
    "DOMAIN-SUFFIX,app-analytics-services.com,🤖 AI 专线",
    "GEOSITE,google-deepmind,🤖 AI 专线",
    "DOMAIN-SUFFIX,googleusercontent.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,gstatic.com,🤖 AI 专线", 
    
    "DOMAIN-SUFFIX,openai.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,chatgpt.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,oaistatic.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,bing.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,copilot.microsoft.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,anthropic.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,claude.ai,🤖 AI 专线",

    // === 5. GitHub 专区 ===
    "DOMAIN-SUFFIX,github.com,⬇️ GitHub",
    "DOMAIN-SUFFIX,githubusercontent.com,⬇️ GitHub",
    "DOMAIN-SUFFIX,github.io,⬇️ GitHub",
    
    // === 6. Google 主站 ===
    "DOMAIN-SUFFIX,google.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,youtube.com,🤖 AI 专线",
    "DOMAIN-SUFFIX,ytimg.com,🤖 AI 专线",
    "DOMAIN-KEYWORD,google,🤖 AI 专线",

    // === 7. 自建 ===
    "PROCESS-NAME,ssh.exe,🚀 节点选择",

    // === 8. 兜底 ===
    "GEOIP,CN,🇨🇳 国内连接",
    "GEOSITE,CN,🇨🇳 国内连接",
    "MATCH,🐟 漏网之鱼"
  ];

  config.rules = customRules;

  return config;
}
