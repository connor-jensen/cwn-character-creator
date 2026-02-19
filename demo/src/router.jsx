import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { STEPS } from "./constants.js";
import RootLayout from "./components/RootLayout/RootLayout.jsx";
import CreatorView from "./components/CreatorView/CreatorView.jsx";
import RosterView from "./components/RosterView/RosterView.jsx";

const hashHistory = createHashHistory();

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/create", search: { step: STEPS[0] } });
  },
});

const createRoute_ = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  validateSearch: (search) => ({
    step: STEPS.includes(search.step) ? search.step : STEPS[0],
  }),
  component: CreatorView,
});

const rosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roster",
  component: RosterView,
});

const routeTree = rootRoute.addChildren([indexRoute, createRoute_, rosterRoute]);

export const router = createRouter({ routeTree, history: hashHistory });
