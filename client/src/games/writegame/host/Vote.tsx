import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  HostVoteState,
  hostVoteState,
  voteOptions,
  voteTitle,
  voteType,
  voteUserVotes,
} from "../../../state/VoteState";
import {
  Grid,
  GridColumn,
  Header,
  List,
  ListContent,
  ListHeader,
  ListItem,
} from "semantic-ui-react";
import { gameUsers } from "../../../state/GameState";

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
  const [_voteType] = useAtom(voteType);

  const votesPerOption: {
    [optionId: string]: {
      userName: string;
      score: number;
    }[];
  } = {};

  if (_hostVoteState == HostVoteState.Finished) {
    _userVotes.forEach((userVote) => {
      const userObj = _users.filter((u) => u.id == userVote.user_id)[0];
      userVote.votes.forEach((vote) => {
        const arr = votesPerOption[vote.option_id] || [];
        arr.push({
          userName: userObj.name || "",
          score: vote.value,
        });
        votesPerOption[vote.option_id] = arr;
      });
    });
  }

  const formatVoteRow = (vote: { userName: string; score: number }) => {
    if (_voteType == "Single") {
      return <li key={`vote-${vote.userName}`}>{vote.userName}</li>;
    }

    return (
      <li key={`vote-${vote.userName}-${vote.score}`}>
        <strong>#{vote.score}</strong> - {vote.userName}
      </li>
    );
  };

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
        <GridColumn width={14}>
          <Header size="medium">{_voteTitle}</Header>
          <List relaxed="very">
            {options.map((option) => {
              return (
                <ListItem key={"option-" + option.id}>
                  <ListContent>
                    <ListHeader>{option.text}</ListHeader>
                    <ul>
                      {(votesPerOption[option.id] || []).map(formatVoteRow)}
                    </ul>
                  </ListContent>
                </ListItem>
              );
            })}
          </List>
        </GridColumn>
      </Grid>
    </div>
  );
};

export default Vote;
