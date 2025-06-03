import { useAtom } from "jotai";
import { selectedSentence, selectedTopic, topics } from "./DeveloperMode";
import { Grid, GridColumn, Input, Select } from "semantic-ui-react";
import SentencesList from "./SentencesList";
import TemplateEditor from "./TemplateEditor";

const TopicSentencesEditor = () => {
  const [_topics, _setTopics] = useAtom(topics);
  const [_selectedTopic] = useAtom(selectedTopic);
  const [_selectedSentence] = useAtom(selectedSentence);

  const topic = _topics[_selectedTopic];

  return (
    <>
      <div className="TopicDetailsEditor">
        <Input
          type="text"
          value={topic.id}
          onChange={(e) => {
            topic.id = e.target.value;
            _setTopics([..._topics]);
          }}
          placeholder="ID"
        />
        <Input
          style={{ paddingLeft: "5px" }}
          type="text"
          value={topic.name}
          onChange={(e) => {
            topic.name = e.target.value;
            _setTopics([..._topics]);
          }}
          placeholder="Name"
        />
        <Select
          placeholder="Layout"
          options={[
            { key: "paragraph", value: "paragraph", text: "Paragraph" },
            { key: "title", value: "title", text: "Title" },
            { key: "verse", value: "verse", text: "Verse" },
          ]}
          value={topic.layout}
          onChange={(_e, { value }) => {
            (topic.layout as any) = value;
            _setTopics([..._topics]);
          }}
        />
      </div>
      <Grid>
        <GridColumn width={8}>
          <SentencesList />
        </GridColumn>
        <GridColumn width={8}>
          {_selectedSentence == -1 ? <></> : <TemplateEditor />}
        </GridColumn>
      </Grid>
    </>
  );
};

export default TopicSentencesEditor;
