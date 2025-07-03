import { toast, ToastContainer } from "react-toastify";
import useWebSocket, { ReadyState } from "react-use-websocket";

import {
  connectionState,
  endpointConfig,
  GlobalGameState,
  globalGameState,
} from "./state/AppState";
import { useEffect } from "react";
import { MessageDispatcher } from "./MessageDispatcher";
import JoinPage from "./games/JoinPage";
import { Container } from "semantic-ui-react";
import { getToken, initUserHandlers, setToken } from "./state/UserState";
import { useAtom } from "jotai";
import { initGameHandlers, initGameHandlersWithSend } from "./state/GameState";
import LobbyPage from "./games/LobbyPage";
import { initVoteHandlers } from "./state/VoteState";
import GamePage from "./games/GamePage";
import { developerModeEnabled } from "./dev/DeveloperMode";
import DeveloperPage from "./dev/DeveloperPage";
import { initPromptHandlers } from "./state/PromptState";
import { TtsLoader } from "./data/TtsLoader";
import { setDevState } from "./dev/DevStates";
import { Store } from "./state/Store";

function App() {
  const [_endpointConfig] = useAtom(endpointConfig);
  const { lastMessage, readyState, sendJsonMessage, getWebSocket } =
    useWebSocket(_endpointConfig?.websocket_url || "", {
			shouldReconnect: () => true,
			heartbeat: {
				message: JSON.stringify({ action: "system/ping", payload: null }),
				returnMessage: JSON.stringify({ action: "system/pong", status: "success", payload: null }),
				interval: 25000,
				timeout: 60000
			}
    });
  const [_connectionState, setConnectionState] = useAtom(connectionState);
  const [_globalGameState] = useAtom(globalGameState);
  const [_developerMode] = useAtom(developerModeEnabled);

  (window as any)["getWebSocket"] = getWebSocket;
  (window as any)["setToken"] = setToken;
  (window as any)["tts"] = TtsLoader;
  (window as any)["setDevState"] = setDevState;
  (window as any)["Store"] = Store;

  useEffect(() => {
    initUserHandlers();
    initGameHandlers();
    initVoteHandlers();
    initPromptHandlers();
  }, []);

  useEffect(() => {
    if (
      _connectionState == ReadyState.OPEN &&
      (readyState == ReadyState.CLOSING || readyState == ReadyState.CLOSED)
    ) {
      toast("Lost connection to server!", { type: "error" });
    } else if (
      (_connectionState == ReadyState.UNINSTANTIATED ||
        _connectionState == ReadyState.CONNECTING) &&
      readyState == ReadyState.CLOSED
    ) {
      toast("Failed to connect to the server!", { type: "error" });
    } else if (
      _connectionState != ReadyState.OPEN &&
      readyState == ReadyState.OPEN
    ) {
      toast("Connected!", { type: "success" });

      if (getToken() != null && _globalGameState != GlobalGameState.Join) {
        MessageDispatcher.sendMessage(sendJsonMessage, "user/rejoin", null);
      }
    }

    setConnectionState(readyState);
  }, [readyState]);

  useEffect(() => {
    if (lastMessage !== null) {
      MessageDispatcher.onReceive(lastMessage);
    }
  }, [lastMessage]);

  useEffect(() => {
    initGameHandlersWithSend(sendJsonMessage);
  }, [sendJsonMessage]);

  if (_developerMode) {
    return <DeveloperPage />;
  }

  let page = <></>;
  if (_globalGameState == GlobalGameState.Join) {
    page = <JoinPage sendJsonMessage={sendJsonMessage} />;
  } else if (_globalGameState == GlobalGameState.Lobby) {
    page = <LobbyPage sendJsonMessage={sendJsonMessage} />;
  } else if (_globalGameState == GlobalGameState.Game) {
    page = <GamePage sendJsonMessage={sendJsonMessage} />;
  }

  return (
    <div className="AppContainer">
      <ToastContainer />
      <Container>{page}</Container>
    </div>
  );
}

export default App;
