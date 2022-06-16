let env = import.meta.env;
let mockPro = true

export default {
    wsPath: env.MODE === "development" && !mockPro ? 'ws://localhost:8030/entity' : 'wss://www.xianneng.top/entity'
}

