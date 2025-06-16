import { useAtom } from "jotai";
import { gameImplState, gameRoundCount } from "../../../state/GameState";
import type { WriteGameImplState } from "../ImplState";
import { Grid, GridColumn, Header } from "semantic-ui-react";
import { hostGameTopic } from "../GameFlow";
import { roundCount } from "../Config";

interface WriteSentenceProps {
  timerSeconds: number;
}

const WriteSentence = (props: WriteSentenceProps) => {
  const [_implState] = useAtom(gameImplState);
  const [_roundCount] = useAtom(gameRoundCount);
  const [_hostGameTopic] = useAtom(hostGameTopic);

  const implState = _implState as WriteGameImplState;
  if (!_hostGameTopic) {
    return <p>no host game topic</p>;
  }

  let sentenceContent = <></>;
  if (_hostGameTopic.layout == "paragraph") {
    sentenceContent = (
      <p>
        {implState.sentences.map((s, index) => {
          return (
            <span
              key={"sentence-" + index}
              className={
                s.author === null ? "Sentence-initial" : "Sentence-user"
              }>
              {s.text}&nbsp;
            </span>
          );
        })}
      </p>
    );
  } else if (_hostGameTopic.layout == "title") {
    sentenceContent = (
      <>
        <Header size="tiny">
          {implState.sentences.length > 0 ? implState.sentences[0].text : ""}
        </Header>
        <p>
          {implState.sentences.slice(1).map((s, index) => {
            return (
              <span
                key={"sentence-" + index}
                className={
                  s.author === null ? "Sentence-initial" : "Sentence-user"
                }>
                {s.text}&nbsp;
              </span>
            );
          })}
        </p>
      </>
    );
  } else if (_hostGameTopic.layout == "verse") {
    sentenceContent = (
      <>
        {implState.sentences.map((s, index) => {
          return (
            <>
              <span
                key={"sentence-" + index}
                className={
                  s.author === null ? "Sentence-initial" : "Sentence-user"
                }>
                {s.text}
              </span>
              <br />
            </>
          );
        })}
      </>
    );
  }

  return (
    <div>
      <Grid>
        <GridColumn width={2}>
          <Header size="large">{props.timerSeconds}</Header>
        </GridColumn>
        <GridColumn width={14}>
          <Header size="medium">
            Round {_roundCount} of {roundCount}
          </Header>
          {sentenceContent}
        </GridColumn>
      </Grid>
    </div>
  );
};

export default WriteSentence;
