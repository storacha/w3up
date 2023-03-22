import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Authenticator } from './components/Authenticator'
import { W3APIProvider } from './components/W3API'

// thanks, https://dev.to/franciscomendes10866/file-based-routing-using-vite-and-react-router-3fdo
const pages = import.meta.glob("./pages/**/*.tsx", { eager: true });

const routes = [];
for (const path of Object.keys(pages)) {
  const fileName = path.match(/\.\/pages\/(.*)\.tsx$/)?.[1];
  if (!fileName) {
    continue;
  }

  const normalizedPathName = fileName.includes("$")
    ? fileName.replace("$", ":")
    : fileName.replace(/\/index/, "");

  routes.push({
    path: fileName === "index" ? "/" : `/${normalizedPathName.toLowerCase()}`,
    Element: pages[path].default,
    loader: pages[path]?.loader,
    action: pages[path]?.action,
    ErrorBoundary: pages[path]?.ErrorBoundary,
  });
}

const router = createBrowserRouter(
  routes.map(({ Element, ErrorBoundary, ...rest }) => ({
    ...rest,
    element: <Element />,
    ...(ErrorBoundary && { errorElement: <ErrorBoundary /> }),
  }))
);

export function App (): JSX.Element {
  return (
    <W3APIProvider uploadsListPageSize={20}>
      <Authenticator className='h-full'>
        <RouterProvider router={router} />
      </Authenticator>
    </W3APIProvider>
  )
}
