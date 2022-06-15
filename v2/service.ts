let env = import.meta.env;


export default {
    wsPath: env.MODE === "development" ? 'ws://localhost:8030/entity' : 'ws://www.xianneng.top:8030/entity'
}

