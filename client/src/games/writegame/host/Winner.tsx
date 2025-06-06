import { useAtom } from "jotai";
import { hostUserScores } from "../GameFlow";
import { Grid, GridColumn, Header } from "semantic-ui-react";
import { gameUsers } from "../../../state/GameState";

function indexToSize(index: number) {
  switch (index) {
    case 0:
      return "huge";
    case 1:
      return "large";
    case 2:
      return "medium";
    default:
      return "small";
  }
}

interface WinnerProps {
  timerSeconds: number;
}

const Winner = (props: WinnerProps) => {
  const [_hostUserScores] = useAtom(hostUserScores);
  const [_users] = useAtom(gameUsers);

  const userNameMap: { [userId: string]: string } = {};

  _users.forEach((user) => {
    userNameMap[user.id] = user.name || "";
  });

  const scoreUsers: {
    userId: string;
    name: string;
    score: number;
  }[] = [];
  Object.keys(_hostUserScores).forEach((userId) => {
    scoreUsers.push({
      userId,
      name: userNameMap[userId],
      score: _hostUserScores[userId].score,
    });
  });

  scoreUsers.sort((a, b) => b.score - a.score);

  return (
    <div>
      <Grid>
        <GridColumn width={2}>
          <Header size="large">{props.timerSeconds}</Header>
        </GridColumn>
        <GridColumn width={14}>
          <Header size="small">Game Over!</Header>
          {scoreUsers.map((scoreUser, index) => {
            const size = indexToSize(index);
            return (
              <div key={`user-${index}`}>
                <Header size={size}>{scoreUser.name}</Header>
                <Header size="tiny">Score: {scoreUser.score}</Header>
              </div>
            );
          })}
        </GridColumn>
      </Grid>
    </div>
  );
};

export default Winner;
