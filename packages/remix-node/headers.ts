import type { ServerBuild } from "./build";
import type { Response } from "./fetch";
import { Headers } from "./fetch";
import type { ServerRoute } from "./routes";
import type { RouteMatch } from "./routeMatching";

export function getDocumentHeaders(
  build: ServerBuild,
  matches: RouteMatch<ServerRoute>[],
  routeLoaderResponses: Response[],
  actionResponse?: Response
): Headers {
  let actionHeaders = actionResponse?.headers || new Headers();

  let finalHeaders = matches.reduce((parentHeaders, match, index) => {
    let routeModule = build.routes[match.route.id].module;
    let loaderHeaders = routeLoaderResponses[index]
      ? routeLoaderResponses[index].headers
      : new Headers();

    let headers = new Headers(
      routeModule.headers
        ? routeModule.headers({ loaderHeaders, parentHeaders, actionHeaders })
        : undefined
    );

    // Automatically preserve Set-Cookie headers that were set either by the
    // loader or by a parent route.
    prependCookies(loaderHeaders, headers);
    prependCookies(parentHeaders, headers);

    return headers;
  }, new Headers());

  prependCookies(finalHeaders, actionHeaders);

  return finalHeaders;
}

function prependCookies(parentHeaders: Headers, childHeaders: Headers): void {
  if (parentHeaders.has("Set-Cookie")) {
    childHeaders.set(
      "Set-Cookie",
      concatSetCookieHeaders(
        parentHeaders.get("Set-Cookie")!,
        childHeaders.get("Set-Cookie")
      )
    );
  }
}

/**
 * Merges two `Set-Cookie` headers, eliminating duplicates and preserving the
 * original ordering.
 */
function concatSetCookieHeaders(
  parentHeader: string,
  childHeader: string | null
): string {
  if (!childHeader || childHeader === parentHeader) {
    return parentHeader;
  }

  let finalCookies: RawSetCookies = new Map();
  let parentCookies = parseSetCookieHeader(parentHeader);
  let childCookies = parseSetCookieHeader(childHeader);

  for (let [name, value] of parentCookies) {
    finalCookies.set(name, childCookies.get(name) || value);
  }

  for (let [name, value] of childCookies) {
    if (!finalCookies.has(name)) {
      finalCookies.set(name, value);
    }
  }

  return serializeSetCookieHeader(finalCookies);
}

type RawSetCookies = Map<string, string>;

function parseSetCookieHeader(header: string): RawSetCookies {
  return header.split(/\s*,\s*/g).reduce((map, pair) => {
    let [name, value] = pair.split("=");
    return map.set(name, value);
  }, new Map());
}

function serializeSetCookieHeader(cookies: RawSetCookies): string {
  let pairs: string[] = [];

  for (let [name, value] of cookies) {
    pairs.push(name + "=" + value);
  }

  return pairs.join(", ");
}