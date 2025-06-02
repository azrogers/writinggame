import { useAtom } from "jotai";
import { gameType } from "../state/GameState";
import WriteGameHostLobby from "./writegame/host/Lobby";
import WriteGameClientLobby from "./writegame/client/Lobby";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { isHosting } from "../state/AppState";

interface LobbyPageProps {
  sendJsonMessage: SendJsonMessage;
}

const LobbyPage = (props: LobbyPageProps) => {
  const [_gameType] = useAtom(gameType);
  const [_isHosting] = useAtom(isHosting);

  if (_isHosting) {
    if (_gameType == "WriteGame") {
      return <WriteGameHostLobby />;
    }
  } else {
    if (_gameType == "WriteGame") {
      return <WriteGameClientLobby sendJsonMessage={props.sendJsonMessage} />;
    }
  }

  return <p>Unknown gameType {_gameType}</p>;
};

export default LobbyPage;
