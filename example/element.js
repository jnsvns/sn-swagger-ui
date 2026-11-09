import '../src/x-535245-swagger-ui';

const el = document.createElement('div');
document.body.appendChild(el);

el.innerHTML = '<x-535245-swagger-ui height="720px"></x-535245-swagger-ui>';

el.querySelector('x-535245-swagger-ui').definition = {
	openapi: '3.0.3',
	info: {title: 'Petstore API', version: '1.0.0'},
	paths: {
		'/pets': {
			get: {
				summary: 'List pets',
				responses: {'200': {description: 'A list of pets'}}
			}
		}
	}
};
