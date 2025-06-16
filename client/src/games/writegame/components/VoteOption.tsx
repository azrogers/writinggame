import { useAtom } from "jotai";
import {
  HostVoteState,
  hostVoteState,
  voteType,
  type VoteOption,
} from "../../../state/VoteState";
import UserIcon from "./UserIcon";
import type { GameUserState } from "../../../state/GameState";

interface VoteOptionProps {
  option: VoteOption;
  votes: {
    user: GameUserState;
    score: number;
  }[];
}

const HostVoteOptionComponent = (props: VoteOptionProps) => {
  const [_voteType] = useAtom(voteType);
  const [_hostVoteState] = useAtom(hostVoteState);

  let scoresDisplay = <></>;
  if (_hostVoteState == HostVoteState.Finished) {
    if (_voteType == "Single") {
      scoresDisplay = (
        <div className="vote-display-single">
          {props.votes.map((vote, i) => (
            <UserIcon key={`vote-${i}`} user={vote.user} />
          ))}
        </div>
      );
    } else if (_voteType == "Ranked") {
      const votes = [...props.votes];
      votes.sort((a, b) => a.score - b.score);

      scoresDisplay = (
        <div className="vote-display-ranked">
          {votes.map((vote, i) => (
            <div key={`vote-${i}`} className={`vote-ranked-${vote.score}`}>
              <UserIcon user={vote.user} />
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="vote-option-host">
      <p>{props.option.content.text}</p>
      {scoresDisplay}
    </div>
  );
};

export default HostVoteOptionComponent;
