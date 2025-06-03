import { useAtom } from "jotai";
import { Grid, GridColumn } from "semantic-ui-react";
import TopicsList from "./TopicsList";
import TopicSentencesEditor from "./TopicSentencesEditor";
import { selectedTopic } from "./DeveloperMode";

const SentencesEditor = () => {
  const [_selectedTopic] = useAtom(selectedTopic);

  return (
    <Grid>
      <GridColumn width={2}>
        <TopicsList />
      </GridColumn>
      <GridColumn width={14}>
        {_selectedTopic == -1 ? <></> : <TopicSentencesEditor />}
      </GridColumn>
    </Grid>
  );
};

export default SentencesEditor;
