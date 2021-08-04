---
title: Application Module APIs
order: 1
---

A lot of Remix API isn't imported from `remix`, but are instead conventions and exports from your application modules.

# remix.config.js

When remix first starts up, it reads your config file, you need to make sure this file is deployed to your server as it's read when the server starts.

```tsx
module.exports = {
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  devServerPort: 8002,
  publicPath: "/build/",
  serverBuildDirectory: "build",
  routes(defineRoutes) {
    return defineRoute((route) => {
      route("/somewhere/cool/*", "catchall.tsx");
    });
  },
};
```

## appDirectory

The path to the `app` directory, relative to remix.config.js. Defaults to "app".

```js
// default
exports.appDirectory = "./app";

// custom
exports.appDirectory = "./elsewhere";
```

## routes

A function for defining custom routes, in addition to those already defined
using the filesystem convention in `app/routes`. Both sets of routes will be merged.

```tsx
exports.routes = async (defineRoutes) => {
  // If you need to do async work, do it before calling `defineRoutes`, we use
  // the call stack of `route` inside to set nesting.

  return defineRoutes((route) => {
    // A common use for this is catchall routes.
    // - The first argument is the React Router path to match against
    // - The second is the relative filename of the route handler
    route("/some/path/*", "catchall.tsx")

    // if you want to nest routes, use the optional callback argument
    route("some/:path", "some/route/file.js", () => {
      // - path is relative to parent path
      // - filenames are still relative to the app directory
      route("relative/path", "some/other/file")
    });

  }
}
```

## browserBuildDirectory

The path to the browser build, relative to remix.config.js. Defaults to "public/build". Should be deployed to static hosting.

## publicPath

The URL prefix of the browser build with a trailing slash. Defaults to "/build/". This is the path the browser will use to find assets.

## serverBuildDirectory

The path to the server build, relative to remix.config.js. Defaults to "build". This needs to be deployed to your server.

## devServerPort

The port number to use for the dev server. Defaults to 8002.

# File Name Conventions

There are a few conventions that Remix uses you should be aware of.

## Special Files

- **`remix.config.js`**: Remix uses this file to know how to build your app for production and run it in development. This file is required.
- **`app/entry.server.{js,tsx}`**: This is your entry into the server rendering piece of Remix. This file is required.
- **`app/entry.client.{js,tsx}`**: This is your entry into the browser rendering/hydration piece of Remix. This file is required.

## Route Filenames

- **`app/root.tsx`**: This is your root layout, or "root route" (very sorry for those of you who pronounce those words the same way!). It works just like all other routes: you can export a `loader`, `action`, etc.
- **`app/routes/*.{js,jsx,tsx,md,mdx}`**: Any files in the `app/routes/` directory will become routes in your application. Remix supports all of those extensions.
- **`app/routes/{folder}/*.js`**: Folders inside of routes will create nested URLs.
- **`app/routes/{folder}` with `app/routes/{folder}.js`**: When a route has the same name as a folder, it becomes a "layout route" for the child routes inside the folder. Render an `<Outlet />` and the child routes will appear there. This is how you can have multiple levels of persistent layout nesting associated with URLs.
- **Dots in route filesnames**: Adding a `.` in a route file will create a nested URL, but not a nested layout. Flat files are flat layouts, nested files are nested layouts. The `.` allows you to create nested URLs without needing to create a bunch of layouts. For example: `routes/some.long.url.tsx` will create the URL `/some/long/url`.
- **`app/routes/index.js`**: Routes named "index" will render when the parent layout route's path is matched exactly.
- **`$param`**: The dollar sign denotes a dynamic segment of the URL. It will be parsed and passed to your loaders and routes.

  For example: `routes/users/$userId.tsx` will match the following URLs: `users/123` and `users/abc` but not `users/123/abc` because that has too many segments. See the <Link to="../routing">routing guide</Link> for more information.

  Some CLIs require you to escape the \$ when creating files:

  ```bash
  touch routes/\$params.tsx
  ```

  Params can be nested routes, just create a folder with the `$` in it.

- **`routes/404.tsx`**: When a URL can't be matched to a route, Remix uses this file to render a 404 page. We don't like this convention because "/404" should be a valid URL (maybe you're showing the best BBQ in Atlanta!). This is what we've got right now though. This will probably.

# entry.client.js

Remix uses `app/entry.client.js` as the entry point for the browser bundle. This module gives you full control over the "hydrate" step after JavaScript loads into the document.

Typically this module uses `ReactDOM.hydrate` to re-hydrate the markup that was already generated on the server in your [server entry module](../entry.server).

Here's a basic example:

```tsx
import ReactDOM from "react-dom";
import Remix from "@remix-run/react/browser";

ReactDOM.hydrate(<Remix />, document);
```

As you can see, you have full control over hydration. This is the first piece of code that runs in the browser. As you can see, you have full control here. You can initialize client side libraries, setup thing likes `window.history.scrollRestoration`, etc.

# entry.server.js

Remix uses `app/entry.server.js` to generate the HTTP response when rendering on the server. The `default` export of this module is a function that lets you create the response, including HTTP status, headers, and HTML, giving you full control over the way the markup is generated and sent to the client.

This module should render the markup for the current page using a `<Remix>` element with the `context` and `url` for the current request. This markup will (optionally) be re-hydrated once JavaScript loads in the browser using the [browser entry module]("../entry.client").

Here's a basic example:

```tsx
import ReactDOMServer from "react-dom/server";
import type { EntryContext } from "remix";
import { RemixServer } from "remix";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = ReactDOMServer.renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
```

# Route Module API

A route in Remix is mostly a React component, with a couple extra exports.

It's important to read [Route Module Constraints](../constraints/).

## Component

The only required export of a route module is a React component. When the URL matches, the component will be rendered.

```tsx
export default function SomeRouteComponent() {
  return (
    <div>
      <h1>Look ma!</h1>
      <p>I'm still using React after like 7 years.</p>
    </div>
  );
}
```

## loader

Each route can define a loader function that will be called before rendering to provide data to the route.

```tsx
export let loader = () => {
  return fetch("https://example.com/api/stuff");
};
```

This function is only ever run on the server. On the initial server render it will be called and provide data to the HTML document. On navigations in the browser, Remix will call the function via `fetch`. This means you can talk directly to your database, use server only API secrets, etc. Any code that isn't used to render the UI will be removed from the browser bundle.

Using the database ORM Prisma as an example:

```tsx [3-5,8]
import { prisma } from "../db";

export let loader = () => {
  return await prisma.user.findMany();
};

export default function Users() {
  let data = useLoaderData();
  return (
    <ul>
      {data.map((user) => (
        <li>{user.name}</li>
      ))}
    </ul>
  );
}
```

Because `prisma` is only used in the loader it will be removed from the browser bundle.

### Loader arg: params

Route params are passed to your loader. If you have a loader at `data/invoices/$invoiceId.js` then Remix will parse out the `invoiceId` and pass it to your loader. This is useful for fetching data from an API or database.

```js
// if the user visits /invoices/123
export let loader: Loader = ({ params }) => {
  params.invoiceId; // "123"
};
```

### Loader arg: request

This is a [Web API Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) instance with information about the request. You can read the MDN docs to see all of it's properties.

You can also use this to read URL [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) from the request like so:

```js
// say the user is at /some/route?foo=bar
export let loader: Loader = ({ request }) => {
  let url = new URL(request.url);
  let foo = url.searchParams.get("foo");
};
```

### Loader arg: context

This is the context you passed in to your deployment wrapper's `getLoaderContext()` function. It's a way to bridge the gap between the platform's request/response API with your remix app.

Say your express server (or your serverless function handler) looks something like this:

```js
const {
  createRequestHandler,
} = require("@remix-run/express");

app.all(
  "*",
  createRequestHandler({
    getLoaderContext(req, res) {
      // this becomes the loader context
      return { req, res };
    },
  })
);
```

And then your loader can access it.

```ts
// data/some-loader.js
export let loader: Loader = ({ context }) => {
  let { req } = context.req;
  // read a cookie
  req.cookies.session;
};
```

### Returning objects

You can return plain JavaScript objects from your loaders that will be made available to your [route modules]("../route-module").

```ts
// some fake database, not part of remix
let db = require("../db");

export let loader = async () => {
  let users = await db.query("users");
  return users;
};
```

### Returning Response Instances

You can return Web API Response objects from your loaders. Here's a pretty basic JSON response:

```js
// some fake database, not part of remix
import db from "../db";

export let loader: Loader = async () => {
  let users = await db.query("users");

  let body = JSON.stringify(users);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
```

Normally you'd use the `json` helper from your [environment](../environments).

```js
import db from "../db";
import { json } from "remix";

export let loader: Loader = async () => {
  let users = await db.query("users");
  return json(users);
};
```

Between these two examples you can see how `json` just does a little of work to make your loader a lot cleaner.

<docs-info>Remix calls loaders in two ways: on the initial HTML document request and as fetch requests on client side transitions. This means loader response headers will not automatically be applied to your document requests. For more info see <a href="#headers">Headers</a></docs-info>

See also:

- (Remix Web Fetch API)["../other/fetch"]
- (`headers`)["#headers"]
- [MDN Response Docs](https://developer.mozilla.org/en-US/docs/Web/API/Response)

### Response Status Codes in Loaders

Loaders can return Responses with status codes. This is very useful for "not found" data making it's way all the way down to the browser's UI with a real 404 status code, 500s, etc.

```js [6]
import { json } from "remix";

export let loader = async () => {
  let res = db.query("users").where("id", "=", "_why");
  if (res === null) {
    return json({ notFound: true }, { status: 404 });
  } else {
    return res;
  }
};
```

This is also useful for 500 error handling. You don't need to render a different page, instead, handle the error, send the data, and send a 500 response to the app.

```js [6-12]
export let loader: Loader = async () => {
  try {
    let stuff = await something();
    return json(stuff);
  } catch (error) {
    return json(
      {
        error: true,
        message: error.message,
      },
      { status: 500 }
    );
  }
};
```

Now your route component can deal with it:

```tsx
export default function Something() {
  let data = useLoaderData();

  if (data.error) {
    return <ErrorMessage>{data.message}</ErrorMessage>;
  }

  // ...
}
```

The initial server render will get a 500 for this page, and client side transitions will get it also.

## action

Like `loader`, action is a server only function to handle data mutations and other actions. If a non-GET request is made to your route (POST, PUT, PATCH, DELETE) then the deepest matching route action is called before the loaders page.

Actions are triggered from `<Form method="post | put | patch | delete" />` submits.

```tsx
import { redirect } from "remix";
import { PrismaClient } from "@prisma/client";

let prisma = new PrismaClient();

export let action = async ({ params, request }) => {
  let data = new URLSearchParams(await request.text());

  let update = await prisma.post.update({
    where: { id: params.postId },
    data: Object.fromEntries(data),
  });

  return redirect(`/posts/${params.postId}`);
};
```

## headers

Each route can define it's own HTTP headers. One of the most important headers is the `Cache-Control` header that indicates to browser and CDN caches where and for how long a page is able to be cached.

```tsx
export function headers({ loaderHeaders, parentHeaders }) {
  return {
    "X-Stretchy-Pants": "its for fun",
    "Cache-Control": "max-age=300, s-maxage=3600",
  };
}
```

Usually your data is a better indicator of your cache duration than your route module (data tends to be more dynamic than markup), so the loader's headers are passed in to `headers()` too:

```tsx
export function headers({ loaderHeaders }) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control"),
  };
}
```

Note: `loaderHeaders` is an instance of the [Web Fetch API]("../fetch") `Headers` class.

Because Remix has nested routes, there's a battle of the headers to be won when nested routes match. In this case, the deepest route wins. Consider these files in the routes directory:

```
├── users.js
└── users
    ├── $userId.js
    └── $userId
        └── profile.js
```

If we are looking at `/users/123/profile` then three routes are rendering:

```tsx
<Users>
  <UserId>
    <Profile />
  </UserId>
</Users>
```

If all three define `headers`, the deepest module wins, in this case `profile.js`.

We don't want surprise headers in your responses, so it's your job to merge them if you'd like. Remix passes in the `parentHeaders` to your `headers` function. So `users.js` headers get passed to `$userId.js`, and then `$userId.js` headers are passed to `profile.js` headers.

That is all to say that Remix has given you a very large gun with which to shoot your foot. You need to be careful not to send a `Cache-Control` from a child route module that is more aggressive than a parent route. Here's some code that picks the least aggressive caching in these cases:

```tsx
import parseCacheControl from "parse-cache-control";

export function headers({ loaderHeaders, parentHeaders }) {
  let loaderCache = parseCacheControl(
    loaderHeaders.get("Cache-Control")
  );
  let parentCache = parseCacheControl(
    parentHeaders.get("Cache-Control")
  );

  // take the most conservative between the parent and loader, otherwise
  // we'll be too aggressive for one of them.
  let maxAge = Math.min(
    loaderCache["max-age"],
    parentCache["max-age"]
  );

  return {
    "Cache-Control": `max-age=${maxAge}`,
  };
}
```

All that said, you can avoid this entire problem by _not defining headers in layout routes_ and only in leaf routes. Every layout that can be visited directly will likely have an "index route". If you only define headers on your leaf routes, not your layout routes, you will never have to worry about merging headers.

## meta

The meta export will set meta tags for your html document. We highly recommend setting the title and description on every route besides layout routes (their index route will set the meta).

```tsx
import type { MetaFunction } from "remix";

export let meta: MetaFunction = () => {
  return {
    title: "Something cool",
    description:
      "This becomes the nice preview on search results.",
  };
};
```

Title is a special case and will render a `<title>` tag, the rest render `<meta name={key} content={value}/>`.

In the case of nested routes, the meta tags are merged, so parent routes can add meta tags with the child routes needing to copy them.

## links

The links function defines which `<link>` elements to add to the page when the user visits a page.

```tsx
import type { LinksFunction } from "remix";
import { block } from "remix";

export let links: LinksFunction = () => {
  return [
    {
      rel: "icon",
      href: "/favicon.png",
      type: "image/png",
    },
    {
      rel: "stylesheet",
      href: "https://example.com/some/styles.css",
    },
    { page: "/users/123" },
    block({
      rel: "preload",
      href: "/images/banner.jpg",
      as: "image",
    }),
  ];
};
```

There are three types of link descriptors you can return:

### HTMLLinkDescriptor

This is an object representation of a normal `<link {...props} />` element. [View the MDN docs for the link API](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link).

Examples:

```tsx
import type { LinksFunction } from "remix";
import { block } from "remix";
import stylesHref from "../styles/something.css";

export let links: LinksFunction = () => {
  return [
    // add a favicon
    {
      rel: "icon",
      href: "/favicon.png",
      type: "image/png",
    },

    // add an external stylesheet
    {
      rel: "stylesheet",
      href: "https://example.com/some/styles.css",
      crossOrigin: "true",
    },

    // add a local stylesheet, remix will fingerprint the file name for
    // production caching
    { rel: "stylesheet", href: stylesHref },

    // prefetch an image into the browser cache that the user is likely to see
    // as they interact with this page, perhaps they click a button to reveal in
    // a summary/details element
    {
      rel: "prefetch",
      as: "image",
      href: "/img/bunny.jpg",
    },

    // only prefetch it if they're on a bigger screen
    {
      rel: "prefetch",
      as: "image",
      href: "/img/bunny.jpg",
      media: "(min-width: 1000px)",
    },
  ];
};
```

### BlockLinkDescriptor

You can block `{ rel: "preload" }` HTMLLinkDescriptors on client side page transitions by wrapping them in `block(descriptor)`.

```tsx
import type { LinksFunction } from "remix";
import { block } from "remix";

export let links: LinksFunction = () => {
  return [
    block({
      rel: "preload",
      as: "image",
      href: "/img/bunny.jpg",
    }),
  ];
};
```

When the user clicks a link to this page, the transition will not complete until the image has loaded into the browser cache. This can help prevent layout shift as the user navigates around.

**Note**: The image will not be fully loaded if the user's initial visit to the website is this page. There's no way for Remix to do that.

**Be careful with this API**: Waiting on images or other assets will drastically slow down the transition from one route to another. Use this feature with discretion.

### PageLinkDescriptor

These descriptors allow you to prefetch the resources for a page the user is _likely_ to navigate to. What do we mean by likely? Some examples:

- User is on the login page, it's likely they'll end up at the dashboard after a successful login attempt, so it's a good idea to prefetch the resources for the dashboard.
- User is on the shopping cart page, it's likely they'll end up on the checkout page next.
- User is on an index page of a list of invoices, it's likely they'll end up on an invoice page.

Let's take the login → dashboard example:

```js
import type { LinksFunction } from "remix";

export let links: LinksFunction = () => {
  return [{ page: "/dashboard" }];
};
```

You can prefetch the data for the next page with the `data` boolean:

```ts
{ page: "/users/123", data: true }
```

**Be careful with this feature**. You don't want to download 10MB of JavaScript and data for pages the user probably won't ever visit.

## ErrorBoundary

An `ErrorBoundary` is a React component that renders whenever there is an error anywhere on the route, either during rendering or during data loading.

**Note:** We use the word "error" to mean an uncaught exception; something you didn't anticipate happening. This is different from other types of "errors" that you are able to recover from easily, for example a 404 error where you can still show something in the user interface to indicate you weren't able to find some data.

A Remix `ErrorBoundary` component works just like normal React [error boundaries](https://reactjs.org/docs/error-boundaries.html), but with a few extra capabilities. When there is an error in your route component, the `ErrorBoundary` will be rendered in its place, nested inside any parent routes. `ErrorBoundary` components also render when there is an error in the `loader` or `action` functions for a route, so all errors for that route may be handled in one spot.

An `ErrorBoundary` component receives one prop: the `error` that occurred.

```ts
export function ErrorBoundary({ error }) {
  return (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
      <p>The stack trace is:</p>
      <pre>{error.stack}</pre>
    </div>
  );
}
```

## handle

Exporting a handle allows you to create application conventions with the `useMatches()` hook. You can put whatever values you want on it:

```js
export let handle = {
  its: "all yours",
};
```

This is almost always used on conjunction with `useMatches`. To see what kinds of things you can do with it, refer to [`useMatches`](../react/#usematches) for more information.

## shouldReload

A function that lets apps optimize which routes should be reloaded on client side transitions:

```ts
import type { ShouldReloadFunction } from "remix";

export let shouldReload: ShouldReloadFunction = ({
  prevLocation,
  nextLocation,
  prevParams,
  nextParams,
}) => false; // or `true`;
```

<docs-warning>This feature is an <i>additional</i> optimization. In general, Remix's design does a great job of only calling the loaders that the next page needs and ensuring your UI is in sync with your server. When you use this feature you risk your data in the UI being out of sync with your server. Use with caution!</docs-warning>

During client side transitions, Remix will optimize reloading of routes that are already rendering, like not reloading layout routes that aren't changing. In other cases, like form submissions or search param changes, Remix doesn't know which routes need to be reloaded so it reloads them all to be safe (to capture data mutations from the submission or ensure loaders that use the search params return new data, etc.).

This function lets apps further optimize by returning `false` when Remix is about to reload a route that is already rendering and will continue to render at the new location.

### Never reloading the root

A common case is a root loader with nothing but enviornment variables: after form submissions, the root probably doesn't need to be reloaded. For this it's very simple, just add this to your `root.tsx`

```js [11-13]
import type {
  LoaderFunction,
  ShouldReloadFunction,
} from "remix";

export let loader: LoaderFunction = () => {
  return {
    ENV: {
      CLOUDINARY_ACCT: process.env.CLOUDINARY_ACCT,
    },
  };
};

export let shouldReload: ShouldReloadFunction = () => {
  return false;
};
```

With this in place, Remix will no longer make a request to your root loader for any reason, not after form submissions, not after search param changes, etc.

### Ignoring search params

Another common case is when you've got nested routes and a child component has a feature that uses the search params in the URL, like a search page or some tabs with state you want to keep in the search params.

Consider these routes:

```
└── $projectId.js
    └── activity.js
```

And lets say the UI looks something like this:

```
┌──────────────────────────────┐
│    Project: Design Revamp    │
├────────┬─────────┬───────────┤
│  Tasks │ Collabs │ >ACTIVITY │
├────────┴─────────┴───────────┤
│  Search: _____________       │
│                              │
│  - Ryan added an image       │
│                              │
│  - Michael commented         │
│                              │
└──────────────────────────────┘
```

The `$activity.js` loader can use the search params to filter the list, so visiting a URL like `/projects/design-revamp/activity?search=image` could filter the list of results. Maybe it looks something like this:

```js [2,7]
export function loader({ request, params }) {
  let url = new URLSearchParams(request.url);
  return exampleDb.activity.findAll({
    where: {
      projectId: params.projectId,
      name: {
        contains: url.searchParams.get("search"),
      },
    },
  });
}
```

This is great for the activity route, but Remix doesn't know if the parent loader, `$projectId.js` _also_ cares about the search params. That's why whenever the search params change Remix does the safest thing and reloads all the routes on the page. In this UI, that's wasted bandwidth for the user, your server, and your database because `$projectId.js` doesn't use the search params.

Consider that our loader for `$projectId.js` looks something like this:

```tsx
export function loader({ params }) {
  return fakedb.findProject(params.projectId);
}
```

Note that it's only using the `params.projectId` to fetch data. That means if the params aren't changing, we don't need to reload this route. So, to prevent Remix from making a request for our project we can add this to `$projectId.js`:

```tsx
export function shouldReload({ prevParams, nextParams }) {
  return prevParams.projectId !== nextParams.projectId;
}
```

Now the only time this route is going to reload is if the projectId param changed. If the user changes the search then the only route being reloaded will be the activity route.

You need to very careful that the values you're diffing in `shouldReload` are the only ones used in your loader. Our `$projectId.js` loader probably looks like this:

# Asset URL Imports

Any files inside the `app` folder can be imported into your modules. Remix will:

1. Copy the file to your browser build directory
2. Fingerprint the file for long-term caching
3. Return the public URL to your module to be used while rendering

It's most common for stylesheets, but can used for anything.

```tsx
// root.tsx
import type { LinksFunction } from "remix";
import styles from "./styles/app.css";
import banner from "./images/banner.jpg";

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export default function Page() {
  return (
    <div>
      <h1>Some Page</h1>
      <img src={banner} />
    </div>
  );
}
```