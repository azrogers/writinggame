import { useAtom } from "jotai";
import { sentences, topics } from "./DeveloperMode";
import { useEffect, useState } from "react";
import { Button, Container, Input, Select } from "semantic-ui-react";
import { SentenceGenerator } from "../data/SentenceGenerator";

const TemplateTester = () => {
  const [_sentences] = useAtom(sentences);
  const [_topics] = useAtom(topics);

  const [currentTopic, setCurrentTopic] = useState("");
  const [numToGenerate, setNumToGenerate] = useState(5);
  const [generatedSentences, setGeneratedSentences] = useState<string[]>([]);

  useEffect(() => {
    if (_topics.length > 0) {
      setCurrentTopic(_topics[0].id);
    }
  }, [_topics]);

  if (_topics.length == 0) {
    return <></>;
  }

  return (
    <Container>
      <div>
        <Select
          options={_topics.map((t) => ({
            key: t.id,
            value: t.id,
            text: t.name,
          }))}
          value={currentTopic}
          onChange={(_e, { value }) => {
            setCurrentTopic(value as string);
          }}
          placeholder="Topic"
        />
        <Input
          type="number"
          minValue={1}
          maxValue={100}
          value={numToGenerate}
          onChange={(e) => {
            setNumToGenerate(Number(e.target.value));
          }}
          placeholder="Number to Generate"
        />
        <Button
          color="green"
          onClick={() => {
            const sentences = [];
            const generator = new SentenceGenerator(_sentences[currentTopic]);
            for (let i = 0; i < numToGenerate; i++) {
              sentences.push(generator.generate());
            }
            setGeneratedSentences(sentences);
          }}>
          Generate Sentences
        </Button>
      </div>
      <div>
        {generatedSentences.map((s) => (
          <p>{s}</p>
        ))}
      </div>
    </Container>
  );
};

export default TemplateTester;
