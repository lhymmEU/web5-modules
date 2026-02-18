# Web5 Modules

Web5 应用拥有去中心化和数据自主的特性。不像传统的Web2应用，一个前端对应一个或者多个确定的后端。
在Web5 应用中，前端需要根据用户注册Web5 DID时的信息，去调用对应的PDS，有点像后端系统根据用户ID做了分片。
因此，Web5 应用的前端工作非常重，需要处理用户注册、登录、数据存储等功能。

同时Web5的规范性要优于传统的Web2，用户信息采用DID规范，读写数据采用ATProto规范等等。
Web5应用必须遵循这些规范，否则无法互通。
因此，可以把这些功能抽离出来，作为一个模块，供Web5应用调用。
既可以降低Web5应用的开发成本，也避免了重复实现这些功能可能导致的不一致性，提高了应用的质量和可维护性。

## 模块

目前梳理出的模块包含：

### keystore

密钥管理模块，负责生成、存储、管理用户的SignKey密钥对。

其功能类似Web3中的钱包，但是安全等级要低，私钥直接存储在浏览器的localstorage上，调用私钥签名时也不会提示用户确认，因此不建议用于存储重要资产。

### PDS

PDS模块，负责与用户的PDS进行交互，包括用户注册、登录、数据读写等功能。

### did

DID模块，负责用户DID的生成、解析、验证等功能。

## 技术架构

采用微应用架构（Module Federation + iframe），每个模块都是一个独立的微应用，可以嵌入到Web5应用中。

这样代码的维护成本会低很多，每个模块都可以独立开发、测试、部署。

keystore 拥有自己的Web UI，类似一个网页钱包，用户可以直接在浏览器中管理自己的SignKey密钥对。

其他模块都只提供远程模块（Federated Modules），供Web5应用调用。

最后会有一个Demo网站，用于展示Web5 Modules的功能。
该网站本身相当于一个没有业务逻辑的Web5应用，作为Demo展示了Web5 Modules的功能。
实现一些工具属性的功能，比如用户注册、登录、DID管理，PDS数据读写等。

## Build with Hot Reload
pnpm build && (pnpm --filter @web5-modules/keystore preview & pnpm --filter @web5-modules/did preview & pnpm --filter @web5-modules/pds preview &) && pnpm dev:console
