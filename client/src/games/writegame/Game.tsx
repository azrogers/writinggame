import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { isHosting } from "../../state/AppState";
import {
  HostVoteState,
  hostVoteState,
  isVoteActive,
  voteOptions,
  voteType,
  voteUserVotes,
} from "../../state/VoteState";
import ClientVote from "./client/Vote";
import HostVote from "./host/Vote";
import { useEffect } from "react";
import {
  hostUiState,
  initWriteGameHandlers,
  onTimerExpire,
  onUiStateChange,
} from "./GameFlow";
import { useTimer } from "react-timer-hook";
import { gameUsers } from "../../state/GameState";
import { Store } from "../../state/Store";

interface GamePageProps {
  sendJsonMessage: SendJsonMessage;
}

const GamePage = (props: GamePageProps) => {
  const [_isHosting] = useAtom(isHosting);
  const [_isVoteActive] = useAtom(isVoteActive);
  const [_hostVoteState] = useAtom(hostVoteState);
  const [_hostUiState] = useAtom(hostUiState);
  const [_users] = useAtom(gameUsers);
  const [_voteType] = useAtom(voteType);
  const [_userVotes] = useAtom(voteUserVotes);

  useEffect(() => {
    initWriteGameHandlers();
  }, []);

  const { restart, totalSeconds, pause, isRunning } = useTimer({
    expiryTimestamp: new Date(),
    autoStart: false,
    onExpire: () => {
      onTimerExpire(props.sendJsonMessage, _hostUiState);
    },
  });

  const stopTimer = () => {
    if (isRunning) {
      pause();
      onTimerExpire(props.sendJsonMessage, _hostUiState);
    }
  };

  if (_hostVoteState == HostVoteState.Active && isRunning) {
    const voteCounts: { [id: string]: number } = {};
    _userVotes.forEach((userVote) => {
      voteCounts[userVote.user_id] = userVote.votes.length;
    });
    const threshold =
      _voteType == "Single" ? 1 : Math.min(Store.get(voteOptions).length, 3);
    const isFinished = _users.every((u) => voteCounts[u.id] >= threshold);
    if (isFinished) {
      stopTimer();
    }
  }

  useEffect(() => {
    onUiStateChange(props.sendJsonMessage, _hostUiState, restart);
  }, [_hostUiState, _isVoteActive]);

  if (_isHosting) {
    if (_hostVoteState != HostVoteState.None) {
      return (
        <HostVote
          sendJsonMessage={props.sendJsonMessage}
          timerSeconds={totalSeconds}
          stopTimer={stopTimer}
        />
      );
    }
  } else {
    if (_isVoteActive) {
      return <ClientVote sendJsonMessage={props.sendJsonMessage} />;
    }
  }

  return <p>No page for current game state.</p>;
};

export default GamePage;
