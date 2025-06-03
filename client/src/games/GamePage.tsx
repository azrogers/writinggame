import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { gameType } from "../state/GameState";
import WriteGame from "./writegame/Game";

interface GamePageProps {
  sendJsonMessage: SendJsonMessage;
}

const GamePage = (props: GamePageProps) => {
  const [_gameType] = useAtom(gameType);

  if (_gameType == "WriteGame") {
    return <WriteGame sendJsonMessage={props.sendJsonMessage} />;
  }

  return <p>Unknown gameType {_gameType}</p>;
};

export default GamePage;
