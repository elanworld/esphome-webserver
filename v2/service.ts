let env = import.meta.env;
let mockPro = true

export default {
    wsPath: env.MODE === "development" && !mockPro ? 'ws://localhost:8030/entity' : 'wss://www.xianneng.top/websocket/entity',
    userInfo: env.MODE === "development" && !mockPro ? 'http://localhost:8080/system/user/userInfo' : 'https://www.xianneng.top/api/system/user/userInfo',
}

