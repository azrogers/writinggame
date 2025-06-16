import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  HostVoteState,
  hostVoteState,
  voteOptions,
  voteTitle,
  voteUserVotes,
} from "../../../state/VoteState";
import { Grid, GridColumn, Header } from "semantic-ui-react";
import { gameUsers, type GameUserState } from "../../../state/GameState";
import HostVoteOptionComponent from "../components/VoteOption";

interface VoteProps {
  sendJsonMessage: SendJsonMessage;
  timerSeconds: number;
  stopTimer: () => void;
}

const Vote = (props: VoteProps) => {
  const [_options] = useAtom(voteOptions);
  const [_voteTitle] = useAtom(voteTitle);
  const [_hostVoteState] = useAtom(hostVoteState);
  const [_userVotes] = useAtom(voteUserVotes);
  const [_users] = useAtom(gameUsers);

  const votesPerOption: {
    [optionId: string]: {
      user: GameUserState;
      score: number;
    }[];
  } = {};

  if (_hostVoteState == HostVoteState.Finished) {
    _userVotes.forEach((userVote) => {
      const userObj = _users.filter((u) => u.id == userVote.user_id)[0];
      userVote.votes.forEach((vote) => {
        const arr = votesPerOption[vote.option_id] || [];
        arr.push({
          score: vote.value,
          user: userObj,
        });
        votesPerOption[vote.option_id] = arr;
      });
    });
  }

  const options = [..._options];
  if (_hostVoteState == HostVoteState.Finished) {
    options.sort((a, b) => b.score - a.score);
  }

  return (
    <div>
      <Grid>
        <GridColumn width={2}>
          <Header size="large">{props.timerSeconds}</Header>
        </GridColumn>
        <GridColumn width={12}>
          <Header size="medium">{_voteTitle}</Header>
          <div className="vote-container">
            {options.map((option) => (
              <HostVoteOptionComponent
                key={`option-${option.id}`}
                option={option}
                votes={votesPerOption[option.id] || []}
              />
            ))}
          </div>
        </GridColumn>
      </Grid>
    </div>
  );
};

export default Vote;
