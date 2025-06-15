import { useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Provider, useAtom } from "jotai";
import { Store } from "./state/Store.ts";
import "semantic-ui-less/semantic.less";
import "./App.css";
import { useAtomsDevtools } from "jotai-devtools";
import { endpointConfig } from "./state/AppState.ts";
import { EndpointConfigLoader } from "./Endpoints.ts";

interface AtomsDevtoolsProps {
  children: ReactNode;
}

// eslint-disable-next-line react-refresh/only-export-components
const AtomsDevtools = (props: AtomsDevtoolsProps) => {
  useAtomsDevtools("app");
  return props.children;
};

// eslint-disable-next-line react-refresh/only-export-components
const EndpointLoader = () => {
  const [_endpointConfig, _setEndpointConfig] = useAtom(endpointConfig);

  useEffect(() => {
    EndpointConfigLoader.load().then((config) => {
      _setEndpointConfig(config);
    });
  }, []);

  if (!_endpointConfig) {
    return <></>;
  }

  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <Provider store={Store}>
    <AtomsDevtools>
      <EndpointLoader />
    </AtomsDevtools>
  </Provider>
);
