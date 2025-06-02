import { useAtom } from "jotai";
import { userImplState } from "../../../state/UserState";
import type { WriteUserImplState } from "../ImplState";
import { Button } from "semantic-ui-react";
import { gameUsers, startGameLeader } from "../../../state/GameState";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { useEffect } from "react";
import { Data } from "../Data";

interface LobbyProps {
  sendJsonMessage: SendJsonMessage;
}

const Lobby = (props: LobbyProps) => {
  const [_userImplStateRaw] = useAtom(userImplState);
  const _userImplState = _userImplStateRaw as WriteUserImplState;
  const [_users] = useAtom(gameUsers);

  useEffect(() => {
    Data.preload();
  }, []);

  let startGameButton = <></>;
  if (_userImplState.user_type == "Leader") {
    startGameButton = (
      <Button
        size="large"
        disabled={_users.length < 2}
        onClick={() => {
          startGameLeader(props.sendJsonMessage);
        }}>
        Start Game
      </Button>
    );
  }

  return (
    <div>
      {startGameButton}
      <p>Waiting for the game to start.</p>
    </div>
  );
};

export default Lobby;
