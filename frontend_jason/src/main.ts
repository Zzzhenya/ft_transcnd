import "./styles.css";
import { initRouter, navigate } from "@/app/router";

const root = document.getElementById("app")!;
const { render } = initRouter(root);

// 초기 진입
render(location.pathname + location.search);

// 데모 링크 (원하면 제거)
Object.assign(window, { navigate });