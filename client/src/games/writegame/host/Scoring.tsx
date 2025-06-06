import { useAtom } from "jotai";
import { gameRoundCount, gameUsers } from "../../../state/GameState";
import { hostUserScores } from "../GameFlow";
import {
  Grid,
  GridColumn,
  Header,
  List,
  ListContent,
  ListHeader,
  ListItem,
} from "semantic-ui-react";

interface ScoringProps {
  timerSeconds: number;
}

const Scoring = (props: ScoringProps) => {
  const [_users] = useAtom(gameUsers);
  const [_hostUserScores] = useAtom(hostUserScores);
  const [_roundCount] = useAtom(gameRoundCount);

  const userNameMap: { [userId: string]: string } = {};

  _users.forEach((user) => {
    userNameMap[user.id] = user.name || "";
  });

  const scoreUsers: {
    userId: string;
    name: string;
    score: number;
    scoreAdded: number;
  }[] = [];
  Object.keys(_hostUserScores).forEach((userId) => {
    scoreUsers.push({
      userId,
      name: userNameMap[userId],
      score: _hostUserScores[userId].score,
      scoreAdded: _hostUserScores[userId].scoreAdded,
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
          <Header size="small">Round {_roundCount}</Header>
          <List>
            {scoreUsers.map((score) => {
              let scoreAdded = <></>;
              if (score.scoreAdded > 0) {
                scoreAdded = <span className="added">+{score.scoreAdded}</span>;
              }

              return (
                <ListItem key={`score-${score.userId}`}>
                  <ListContent>
                    <ListHeader>{score.name}</ListHeader>
                    <p>
                      <span>Score: {score.score}</span> {scoreAdded}
                    </p>
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

export default Scoring;
