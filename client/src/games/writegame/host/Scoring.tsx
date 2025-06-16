import { useAtom } from "jotai";
import {
  gameRoundCount,
  gameUsers,
  type GameUserState,
} from "../../../state/GameState";
import { hostUserScores } from "../GameFlow";
import { Grid, GridColumn, Header } from "semantic-ui-react";
import UserIcon from "../components/UserIcon";
import Username from "../components/Username";
import { useEffect, useState } from "react";
import { formatScore, lerp } from "../../../lib/util";
import { roundCount } from "../Config";

interface ScoringProps {
  timerSeconds: number;
}

const SCORE_LERP_TIME = 1.0;
const SCORE_LERP_WAIT = 1.0;

const Scoring = (props: ScoringProps) => {
  const [_users] = useAtom(gameUsers);
  const [_hostUserScores] = useAtom(hostUserScores);
  const [_roundCount] = useAtom(gameRoundCount);

  const [lerpAmount, setLerpAmount] = useState(0);
  const [isLerping, setIsLerping] = useState(false);

  if (isLerping && lerpAmount < 1) {
    setTimeout(() => {
      setLerpAmount(lerpAmount + 0.01 / SCORE_LERP_TIME);
    }, 10);
  }

  useEffect(() => {
    setLerpAmount(0);
    setIsLerping(false);
    setTimeout(() => {
      setIsLerping(true);
    }, SCORE_LERP_WAIT * 1000);
  }, [_hostUserScores]);

  const userMap: { [userId: string]: GameUserState } = {};

  _users.forEach((user) => {
    userMap[user.id] = user;
  });

  const scoreUsers: {
    user: GameUserState;
    score: number;
    scoreAdded: number;
  }[] = [];
  Object.keys(_hostUserScores).forEach((userId) => {
    const scoreObj = { ..._hostUserScores[userId] };
    scoreUsers.push({
      user: userMap[userId],
      score: scoreObj.score,
      scoreAdded: scoreObj.scoreAdded,
    });
  });

  scoreUsers.sort((a, b) => b.score - a.score);

  return (
    <div>
      <Grid>
        <GridColumn width={2}>
          <Header size="large">{props.timerSeconds}</Header>
        </GridColumn>
        <GridColumn width={12}>
          <Header size="medium">
            Round {_roundCount} of {roundCount}
          </Header>
          <div className="score-users-list">
            {scoreUsers.map((score) => {
              return (
                <div
                  className="score-users-list-item"
                  key={"user-" + score.user.id}>
                  <UserIcon user={score.user} />
                  <Username username={score.user.name} />
                  {lerpAmount < 1 ? (
                    <Header className="score-added">
                      +{formatScore(lerp(score.scoreAdded, 0, lerpAmount))}
                    </Header>
                  ) : (
                    <></>
                  )}
                  <Header floated="right">
                    {formatScore(
                      lerp(
                        score.score - score.scoreAdded,
                        score.score,
                        lerpAmount
                      )
                    )}
                  </Header>
                </div>
              );
            })}
          </div>
        </GridColumn>
      </Grid>
    </div>
  );
};

export default Scoring;
