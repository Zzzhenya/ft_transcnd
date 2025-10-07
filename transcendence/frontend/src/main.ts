// Load styles from TailwindCSS
import "./styles.css";

// Router setup: History API (f / b) + link interception.
import { initRouter } from "./app/router";

// Get app's root (main: "app"), start router, render current URL(= home)
const root = document.querySelector<HTMLElement>("main#app")!;
if (!root) throw new Error("Root element #app not found");

const { render } = initRouter(root);
render(location.pathname + location.search);