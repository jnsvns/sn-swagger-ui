import { createCustomElement } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import { load as loadYaml } from "js-yaml";
// The `swagger-ui-bundle` distribution includes React and Swagger UI's other
// browser dependencies. The smaller `swagger-ui.js` entry leaves those as
// CommonJS externals, which are not available in a UI Builder component.
import SwaggerUI from "swagger-ui-dist/swagger-ui-bundle.js";
import styles from "./styles.scss";

const swaggerSystems = new WeakMap();
const swaggerSystemsByHost = new WeakMap();
const pendingMounts = new WeakSet();

const DEFAULT_SPEC = {
	openapi: "3.0.3",
	info: { title: "OpenAPI definition", version: "1.0.0" },
	paths: {},
};

// UI Builder supplies a JSON property either as an object or as a serialized
// string. Data-resource bindings can additionally wrap the value in `data` or
// `value`, so unwrap those forms before handing the document to Swagger UI.
const toSpec = (value, depth = 0) => {
	if (!value || depth > 2) return null;
	if (typeof value === "string") {
		try {
			return toSpec(JSON.parse(value), depth + 1);
		} catch {
			try {
				return toSpec(loadYaml(value), depth + 1);
			} catch {
				return null;
			}
		}
	}
	if (typeof value !== "object") return null;
	if (value.openapi || value.swagger) return value;

	for (const key of ["data", "value", "result", "spec"]) {
		if (Object.prototype.hasOwnProperty.call(value, key)) {
			const nestedSpec = toSpec(value[key], depth + 1);
			if (nestedSpec) return nestedSpec;
		}
	}

	return null;
};

const configFor = (element, properties) => {
	const spec = toSpec(properties.definition);
	const url = String(properties.definitionUrl || "").trim();
	return {
		domNode: element,
		deepLinking: properties.deepLinking,
		displayOperationId: properties.displayOperationId,
		docExpansion: properties.docExpansion,
		filter: properties.filter,
		persistAuthorization: properties.persistAuthorization,
		showExtensions: properties.showExtensions,
		tryItOutEnabled: properties.tryItOutEnabled,
		validatorUrl: null,
		...(spec ? { spec } : url ? { url } : { spec: DEFAULT_SPEC }),
	};
};

const normalizeBoolean = (value) =>
	value === true || value === "true" || value === 1 || value === "1";

const updateSwaggerUIConfiguration = (system, properties) => {
	if (
		!system.configsActions ||
		typeof system.configsActions.update !== "function"
	)
		return;

	system.configsActions.update(
		"deepLinking",
		normalizeBoolean(properties.deepLinking),
	);
	system.configsActions.update(
		"displayOperationId",
		normalizeBoolean(properties.displayOperationId),
	);
	system.configsActions.update(
		"docExpansion",
		properties.docExpansion || "list",
	);
	system.configsActions.update("filter", normalizeBoolean(properties.filter));
	system.configsActions.update(
		"persistAuthorization",
		normalizeBoolean(properties.persistAuthorization),
	);
	system.configsActions.update(
		"showExtensions",
		normalizeBoolean(properties.showExtensions),
	);
	system.configsActions.update(
		"tryItOutEnabled",
		normalizeBoolean(properties.tryItOutEnabled),
	);
};

const updateSwaggerUI = (system, properties) => {
	updateSwaggerUIConfiguration(system, properties);
	const spec = toSpec(properties.definition);
	const url = String(properties.definitionUrl || "").trim();
	if (spec) {
		system.specActions.updateUrl("");
		system.specActions.updateLoadingStatus("success");
		system.specActions.updateSpec(JSON.stringify(spec));
		return;
	}
	if (url && url !== system.specSelectors.url()) {
		system.specActions.updateUrl(url);
		system.specActions.download(url);
	}
};

const refreshSwaggerUI = (host) => {
	const system = swaggerSystemsByHost.get(host);
	if (!system) return;

	updateSwaggerUI(system, {
		definition: host.definition,
		definitionUrl: host.definitionUrl,
	});
};

// Page-ready handlers can update a bound property after this component has
// rendered but before Swagger UI is mounted on the next animation frame.
// Read from the custom-element host at mount time rather than using that
// first render's stale property snapshot.
const currentProperties = (element, fallbackProperties) => {
	const host = element.getRootNode().host;
	if (!host) return fallbackProperties;

	return {
		...fallbackProperties,
		definition: host.definition,
		definitionUrl: host.definitionUrl,
		deepLinking: host.deepLinking,
		displayOperationId: host.displayOperationId,
		docExpansion: host.docExpansion,
		filter: host.filter,
		persistAuthorization: host.persistAuthorization,
		showExtensions: host.showExtensions,
		tryItOutEnabled: host.tryItOutEnabled,
	};
};

const mount = (element, properties) => {
	if (!element) return;
	const existingSystem = swaggerSystems.get(element);
	if (existingSystem) {
		updateSwaggerUI(existingSystem, properties);
		return;
	}
	if (pendingMounts.has(element)) return;
	pendingMounts.add(element);
	requestAnimationFrame(() => {
		pendingMounts.delete(element);
		if (!element.isConnected || swaggerSystems.has(element)) return;
		const mountProperties = currentProperties(element, properties);
		const system = SwaggerUI(configFor(element, mountProperties));
		swaggerSystems.set(element, system);
		const host = element.getRootNode().host;
		if (host) swaggerSystemsByHost.set(host, system);

		// A UI Builder data binding can resolve between the first render and the
		// next browser frame. Re-apply the current property value once Swagger UI
		// has completed its initial setup instead of leaving its empty placeholder
		// document on screen.
		setTimeout(
			() => updateSwaggerUI(system, currentProperties(element, properties)),
			0,
		);
	});
};

const normalizeHeight = (value) => {
	if (typeof value === "number" && Number.isFinite(value))
		return `${Math.max(240, value)}px`;
	if (typeof value === "string" && value.trim()) return value.trim();
	return "100%";
};

const view = ({ properties }) => (
	<div
		className="swagger-ui-host"
		style={{ "--swagger-ui-height": normalizeHeight(properties.height) }}
		role="application"
		aria-label={properties.title}
		ref={(element) => mount(element, properties)}
	/>
);

createCustomElement("x-535245-swagger-ui", {
	renderer: { type: snabbdom },
	view,
	styles,
	onPropertiesSet: (host) => refreshSwaggerUI(host),
	properties: {
		title: { default: "API documentation" },
		definition: { default: null },
		definitionUrl: { default: "" },
		height: { default: "100%", schema: { type: "string" } },
		deepLinking: { default: true },
		displayOperationId: { default: false },
		docExpansion: { default: "list" },
		filter: { default: false },
		persistAuthorization: { default: false },
		showExtensions: { default: false },
		tryItOutEnabled: { default: false },
	},
});
