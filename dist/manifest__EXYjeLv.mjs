import '@astrojs/internal-helpers/path';
import 'cookie';
import 'kleur/colors';
import 'es-module-lexer';
import { B as NOOP_MIDDLEWARE_HEADER, C as decodeKey } from './chunks/astro/server_DT4nVU3p.mjs';
import 'clsx';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from tRPC error code table
  // https://trpc.io/docs/server/error-handling#error-codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 405,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/","adapterName":"","routes":[{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/404.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/cv/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/cv","isIndex":false,"type":"page","pattern":"^\\/cv\\/?$","segments":[[{"content":"cv","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/cv.astro","pathname":"/cv","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/gallery/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/gallery","isIndex":false,"type":"page","pattern":"^\\/gallery\\/?$","segments":[[{"content":"gallery","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/gallery.astro","pathname":"/gallery","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/personal/altoids-ipod/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/portfolio/personal/altoids-ipod","isIndex":false,"type":"page","pattern":"^\\/portfolio\\/personal\\/altoids-ipod\\/?$","segments":[[{"content":"portfolio","dynamic":false,"spread":false}],[{"content":"personal","dynamic":false,"spread":false}],[{"content":"altoids-ipod","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/portfolio/personal/altoids-ipod.astro","pathname":"/portfolio/personal/altoids-ipod","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/personal/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/portfolio/personal","isIndex":false,"type":"page","pattern":"^\\/portfolio\\/personal\\/?$","segments":[[{"content":"portfolio","dynamic":false,"spread":false}],[{"content":"personal","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/portfolio/personal.astro","pathname":"/portfolio/personal","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/research/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/portfolio/research","isIndex":false,"type":"page","pattern":"^\\/portfolio\\/research\\/?$","segments":[[{"content":"portfolio","dynamic":false,"spread":false}],[{"content":"research","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/portfolio/research.astro","pathname":"/portfolio/research","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/portfolio","isIndex":false,"type":"page","pattern":"^\\/portfolio\\/?$","segments":[[{"content":"portfolio","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/portfolio.astro","pathname":"/portfolio","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/rss.xml","links":[],"scripts":[],"styles":[],"routeData":{"route":"/rss.xml","isIndex":false,"type":"endpoint","pattern":"^\\/rss\\.xml\\/?$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.js","pathname":"/rss.xml","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/services/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/services","isIndex":false,"type":"page","pattern":"^\\/services\\/?$","segments":[[{"content":"services","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/services.astro","pathname":"/services","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"site":"https://greenvinculum.github.io/","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/[...page].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/[slug].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/[slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/tag/[tag]/[...page].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/tag/[tag]/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/rss.xml.js",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/rss.xml@_@js",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/store/[...page].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/store/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/store/[slug].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/store/[slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/404.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/cv.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/gallery.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/index.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal/altoids-ipod.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/research.astro",{"propagation":"none","containsHead":true}],["C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/services.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(o,t)=>{let i=async()=>{await(await o())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var l=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let a of e)if(a.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=l;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/blog/tag/[tag]/[...page]@_@astro":"pages/blog/tag/_tag_/_---page_.astro.mjs","\u0000@astro-page:src/pages/blog/[slug]@_@astro":"pages/blog/_slug_.astro.mjs","\u0000@astro-page:src/pages/blog/[...page]@_@astro":"pages/blog/_---page_.astro.mjs","\u0000@astro-page:src/pages/cv@_@astro":"pages/cv.astro.mjs","\u0000@astro-page:src/pages/gallery@_@astro":"pages/gallery.astro.mjs","\u0000@astro-page:src/pages/portfolio/personal/altoids-ipod@_@astro":"pages/portfolio/personal/altoids-ipod.astro.mjs","\u0000@astro-page:src/pages/portfolio/personal@_@astro":"pages/portfolio/personal.astro.mjs","\u0000@astro-page:src/pages/portfolio/research@_@astro":"pages/portfolio/research.astro.mjs","\u0000@astro-page:src/pages/portfolio@_@astro":"pages/portfolio.astro.mjs","\u0000@astro-page:src/pages/rss.xml@_@js":"pages/rss.xml.astro.mjs","\u0000@astro-page:src/pages/services@_@astro":"pages/services.astro.mjs","\u0000@astro-page:src/pages/store/[slug]@_@astro":"pages/store/_slug_.astro.mjs","\u0000@astro-page:src/pages/store/[...page]@_@astro":"pages/store/_---page_.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-manifest":"manifest__EXYjeLv.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post1.md?astroContentCollectionEntry=true":"chunks/post1_CllA4NbQ.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post2.md?astroContentCollectionEntry=true":"chunks/post2_C9tE9MSe.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post3.md?astroContentCollectionEntry=true":"chunks/post3_DukKeUhV.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item1.md?astroContentCollectionEntry=true":"chunks/item1_C3yfEhFi.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item2.md?astroContentCollectionEntry=true":"chunks/item2_Ca3epMV5.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item3.md?astroContentCollectionEntry=true":"chunks/item3_D67VQgOm.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post1.md?astroPropagatedAssets":"chunks/post1_BarAVyiE.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post2.md?astroPropagatedAssets":"chunks/post2_CnfLcGrg.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post3.md?astroPropagatedAssets":"chunks/post3_D1RtgPbw.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item1.md?astroPropagatedAssets":"chunks/item1_BiZ3zY2O.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item2.md?astroPropagatedAssets":"chunks/item2_lGhb4az0.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item3.md?astroPropagatedAssets":"chunks/item3_KY5YcXNY.mjs","\u0000astro:asset-imports":"chunks/_astro_asset-imports_D9aVaOQr.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_BcEe_9wP.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post1.md":"chunks/post1_kS9-hArK.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post2.md":"chunks/post2_Cx0RQ5bz.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/blog/post3.md":"chunks/post3_BkAjSTY6.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item1.md":"chunks/item1_CEHwY-zJ.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item2.md":"chunks/item2_CUtvdOtQ.mjs","C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/content/store/item3.md":"chunks/item3_BnBu0jaL.mjs","/astro/hoisted.js?q=0":"_astro/hoisted.87B6lrC3.js","/astro/hoisted.js?q=1":"_astro/hoisted.BQIjlCaN.js","/astro/hoisted.js?q=2":"_astro/hoisted.DJxrZYQk.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/404.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/cv/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/gallery/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/personal/altoids-ipod/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/personal/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/research/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/portfolio/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/rss.xml","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/services/index.html","/file:///C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/dist/index.html"],"buildFormat":"directory","checkOrigin":false,"serverIslandNameMap":[],"key":"WiN6oKj1a4rPmlIdArAzCTMj47MsK5Njw3CiV3eCO0Q=","experimentalEnvGetSecretEnabled":false});

export { manifest };
