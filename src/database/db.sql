-- public.a_chain_config definition

-- Drop table

-- DROP TABLE public.a_chain_config;
-- 订阅区块配置表 添加之后可以通过接口或命令行刷新 订阅
CREATE TABLE public.a_chain_config (
                                       id BIGSERIAL PRIMARY KEY, -- 使用 BIGSERIAL，它会自动创建序列并设置默认值
                                       "chain" varchar NOT NULL,
                                       chain_id varchar NULL,
                                       symbol varchar NULL, -- 主币名字
                                       rpc_http varchar NULL,
                                       rpc_ws varchar NULL,
                                       "interval" int4 NULL, -- rpc 订阅请求间隔 wss不需要
                                       internal_rpc_http varchar NULL,
                                       internal_rpc_ws varchar NULL,
                                       full_tx varchar NULL, -- 是否全量交易
                                       "enable" varchar NULL -- 开启状态
);

COMMENT ON COLUMN public.a_chain_config."chain" IS '链';
COMMENT ON COLUMN public.a_chain_config.chain_id IS '链id';
COMMENT ON COLUMN public.a_chain_config.symbol IS '主币名字';
COMMENT ON COLUMN public.a_chain_config.rpc_http IS '三方节点rpc bak用 假设本地节点挂了 使用三方rpc';
COMMENT ON COLUMN public.a_chain_config.rpc_ws IS 'wss rpc';
COMMENT ON COLUMN public.a_chain_config."interval" IS 'rpc 请求间隔 wss好像不需要';
COMMENT ON COLUMN public.a_chain_config.internal_rpc_http IS '本地节点rpc';
COMMENT ON COLUMN public.a_chain_config.full_tx IS '是否全量交易';
COMMENT ON COLUMN public.a_chain_config."enable" IS '开启状态';



-- public.a_monitor_address definition

-- Drop table

-- DROP TABLE public.a_monitor_address;
-- 监控的路由/factory
CREATE TABLE public.a_monitor_address (
                                          id bigserial NOT NULL,
                                          address varchar NULL,    -- 路由地址
                                          address_type varchar NULL, -- factory/router
                                          label varchar NULL,  --
                                          CONSTRAINT a_monitor_address_pk PRIMARY KEY (id)
);

-- Column comments

COMMENT ON COLUMN public.a_monitor_address.address_type IS 'factory/router';


-- public.a_monitor_abi definition

-- Drop table

-- DROP TABLE public.a_monitor_abi;
-- 监控的abi
-- public.a_monitor_abi definition

-- Drop table

-- DROP TABLE public.a_monitor_abi;

CREATE TABLE public.a_monitor_abi (
                                      id bigserial NOT NULL,
                                      signature varchar NULL, -- 方法签名
                                      method_type varchar NULL, -- function/event
                                      method_id varchar NULL, -- log_topic/method_id
                                      contract varchar NULL, -- 合约地址
                                      "label" varchar NULL -- 说明
);

-- Column comments

COMMENT ON COLUMN public.a_monitor_abi.signature IS '方法签名';
COMMENT ON COLUMN public.a_monitor_abi.method_type IS 'function/event';
COMMENT ON COLUMN public.a_monitor_abi.method_id IS 'log_topic/method_id';
COMMENT ON COLUMN public.a_monitor_abi.contract IS '合约地址';
COMMENT ON COLUMN public.a_monitor_abi."label" IS '说明';