import { Tab, TabPane } from "semantic-ui-react";
import SentencesEditor from "./SentencesEditor";
import { useEffect } from "react";
import { Data } from "../games/writegame/Data";
import { Store } from "../state/Store";
import { sentences, topics } from "./DeveloperMode";
import TemplateTester from "./TemplateTester";

const DeveloperPage = () => {
  useEffect(() => {
    Data.topics().then((t) => {
      Store.set(topics, t);
    });

    Data.sentences().then((s) => {
      Store.set(sentences, s);
    });
  }, []);

  return (
    <div className="DeveloperMode" style={{ minHeight: "100%" }}>
      <Tab
        style={{ minHeight: "100%" }}
        panes={[
          {
            menuItem: "Template Tester",
            render: () => (
              <TabPane style={{ minHeight: "100%" }}>
                <TemplateTester />
              </TabPane>
            ),
          },
          {
            menuItem: "Sentences Editor",
            render: () => (
              <TabPane style={{ minHeight: "100%" }}>
                <SentencesEditor />
              </TabPane>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DeveloperPage;
