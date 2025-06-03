import { toast, ToastContainer } from "react-toastify";
import "./App.css";
import useWebSocket, { ReadyState } from "react-use-websocket";

import {
  connectionState,
  GlobalGameState,
  globalGameState,
} from "./state/AppState";
import { useEffect } from "react";
import { MessageDispatcher } from "./MessageDispatcher";
import JoinPage from "./games/JoinPage";
import { Container } from "semantic-ui-react";
import { initUserHandlers } from "./state/UserState";
import { useAtom } from "jotai";
import { initGameHandlers, initGameHandlersWithSend } from "./state/GameState";
import LobbyPage from "./games/LobbyPage";
import { initVoteHandlers } from "./state/VoteState";
import GamePage from "./games/GamePage";

const SOCKET_URL: string = "ws://localhost:3030/ws";

function App() {
  const { lastMessage, readyState, sendJsonMessage } = useWebSocket(SOCKET_URL);
  const [_connectionState, setConnectionState] = useAtom(connectionState);
  const [_globalGameState] = useAtom(globalGameState);

  useEffect(() => {
    initUserHandlers();
    initGameHandlers();
    initVoteHandlers();
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
