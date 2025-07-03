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
  HostUIState,
  hostUiState,
  initWriteGameHandlers,
  onTimerExpire,
  onUiStateChange,
} from "./GameFlow";
import { useTimer } from "react-timer-hook";
import { gameUsers } from "../../state/GameState";
import { Store } from "../../state/Store";
import ClientPrompt from "./client/Prompt";
import {
  HostPromptState,
  hostPromptState,
  isPromptActive,
  promptUserResponses,
} from "../../state/PromptState";
import WriteSentence from "./host/WriteSentence";
import Scoring from "./host/Scoring";
import Winner from "./host/Winner";
import Sound from "../../Sound";

interface GamePageProps {
  sendJsonMessage: SendJsonMessage;
}

const GamePage = (props: GamePageProps) => {
  const [_isHosting] = useAtom(isHosting);
  const [_isVoteActive] = useAtom(isVoteActive);
  const [_isPromptActive] = useAtom(isPromptActive);
  const [_hostVoteState] = useAtom(hostVoteState);
  const [_hostPromptState] = useAtom(hostPromptState);
  const [_hostUiState] = useAtom(hostUiState);
  const [_users] = useAtom(gameUsers);
  const [_voteType] = useAtom(voteType);
  const [_userVotes] = useAtom(voteUserVotes);
  const [_userPromptResponses] = useAtom(promptUserResponses);

  const { restart, totalSeconds, pause, isRunning } = useTimer({
    expiryTimestamp: new Date(),
		autoStart: false,
		onExpire: () =>
		{
      onTimerExpire(props.sendJsonMessage, _hostUiState);
    },
	});
	
	useEffect(() =>
	{
		if (_isPromptActive || _isVoteActive)
		{
			if (totalSeconds > 0 && totalSeconds < 5)
			{
				Sound.sfxPlay("timer_tick");
			}
		}
	}, [totalSeconds]);

  useEffect(() => {
    initWriteGameHandlers(props.sendJsonMessage);
  }, []);

  useEffect(() => {
    onUiStateChange(props.sendJsonMessage, _hostUiState, restart);
  }, [_hostUiState, _isVoteActive, _isPromptActive]);

  const stopTimer = () => {
    if (isRunning) {
      pause();
      onTimerExpire(props.sendJsonMessage, _hostUiState);
    }
  };

  if (_hostVoteState == HostVoteState.Active && isRunning) {
    const voteCounts: { [id: string]: number } = {};
    const expectedCounts: { [id: string]: number } = {};
    const options = Store.get(voteOptions);
    _userVotes.forEach((userVote) => {
      voteCounts[userVote.user_id] = userVote.votes.length;
      expectedCounts[userVote.user_id] = Math.min(
        options.filter((o) => o.exclude_user !== userVote.user_id).length,
        _voteType == "Single" ? 1 : 3
      );
    });
    const isFinished = _users.every(
      (u) => voteCounts[u.id] >= expectedCounts[u.id]
    );
    if (isFinished) {
      stopTimer();
    }
  }

  if (
    _hostPromptState == HostPromptState.Active &&
    isRunning &&
    _hostUiState == HostUIState.WriteSentence
  ) {
    if (_userPromptResponses.length >= _users.length) {
      stopTimer();
    }
  }

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

    if (_hostUiState == HostUIState.Scoring) {
      return <Scoring timerSeconds={totalSeconds} />;
    } else if (_hostUiState == HostUIState.AwardWinner) {
      return <Winner timerSeconds={totalSeconds} />;
    }

    return <WriteSentence timerSeconds={totalSeconds} />;
  } else {
    if (_isVoteActive) {
      return <ClientVote sendJsonMessage={props.sendJsonMessage} />;
    } else if (_isPromptActive) {
      return <ClientPrompt sendJsonMessage={props.sendJsonMessage} />;
    }
  }

  return <p>Look at the screen!</p>;
};

export default GamePage;
