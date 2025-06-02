import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "jotai";
import { Store } from "./state/Store.ts";
import "semantic-ui-css/semantic.min.css";
import { useAtomsDevtools } from "jotai-devtools";

interface AtomsDevtoolsProps {
  children: ReactNode;
}

// eslint-disable-next-line react-refresh/only-export-components
const AtomsDevtools = (props: AtomsDevtoolsProps) => {
  useAtomsDevtools("app");
  return props.children;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={Store}>
      <AtomsDevtools>
        <App />
      </AtomsDevtools>
    </Provider>
  </StrictMode>
);
