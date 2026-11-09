# Swagger UI

`x-535245-swagger-ui` embeds [Swagger UI](https://swagger.io/tools/swagger-ui/) in a Next Experience component.

Set either `definition` to an OpenAPI JSON/YAML object or string, or `definitionUrl` to a reachable OpenAPI document. Inline definitions take precedence over the URL. An inline definition must include an `openapi` (or Swagger 2 `swagger`) version field.

```html
<x-535245-swagger-ui height="720px"></x-535245-swagger-ui>
```

```js
const apiDocs = document.querySelector('x-535245-swagger-ui');
apiDocs.definitionUrl = '/api/x_example/openapi.json';
// Or: apiDocs.definition = {openapi: '3.0.3', info: {...}, paths: {...}};
```

The component supports `title`, `height`, `deepLinking`, `displayOperationId`, `docExpansion`, `filter`, `persistAuthorization`, `showExtensions`, and `tryItOutEnabled` properties. `tryItOutEnabled` only exposes Swagger UI controls; the target API must still permit the browser request (authentication, CORS, and ACLs).
