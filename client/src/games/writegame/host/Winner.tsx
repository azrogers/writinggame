import { useAtom } from "jotai";
import { hostUserScores } from "../GameFlow";
import { Grid, GridColumn, Header, Image } from "semantic-ui-react";
import { gameUsers, type GameUserState } from "../../../state/GameState";
import { formatScore } from "../../../lib/util";
import { IconsManager } from "../../../data/IconsManager";

interface WinnerProps {
  timerSeconds: number;
}

const Winner = (props: WinnerProps) => {
  const [_hostUserScores] = useAtom(hostUserScores);
  const [_users] = useAtom(gameUsers);

  const userMap: { [userId: string]: GameUserState } = {};

  _users.forEach((user) => {
    userMap[user.id] = user;
  });

  const scoreUsers: {
    user: GameUserState;
    score: number;
  }[] = [];
  Object.keys(_hostUserScores).forEach((userId) => {
    scoreUsers.push({
      user: userMap[userId],
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
          <Header size="huge" style={{ textAlign: "center" }}>
            Winner!
          </Header>
          <div className="winner-user-list">
            {scoreUsers.map((scoreUser, index) => {
              return (
                <div
                  className={
                    "winner-user-item" + (index == 0 ? " winner" : " loser")
                  }
                  key={`user-${index}`}>
                  <Image
                    size={index == 0 ? "small" : "tiny"}
                    src={IconsManager.getImageUrl(scoreUser.user.icon_id)}
                  />
                  <div className="user-info">
                    <Header
                      className="username"
                      size={index == 0 ? "huge" : "medium"}>
                      {scoreUser.user.name}
                    </Header>
                    <Header size="tiny">{formatScore(scoreUser.score)}</Header>
                  </div>
                </div>
              );
            })}
          </div>
        </GridColumn>
      </Grid>
    </div>
  );
};

export default Winner;
