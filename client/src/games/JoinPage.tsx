import { Formik } from "formik";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  Button,
  Form,
  FormField,
  Grid,
  GridColumn,
  GridRow,
  Header,
  Input,
} from "semantic-ui-react";
import { getUserJoinInfo, joinGame } from "../state/UserState";
import {
  checkGame,
  checkGameInfo,
  creatingGame,
  gameTypeToString,
  hostGame,
} from "../state/GameState";
import { useAtom } from "jotai";
import { Store } from "../state/Store";
import { developerModeEnabled } from "../dev/DeveloperMode";
import { useEffect } from "react";

const JOIN_CODE_LEN = 5;
const DEVELOPER_MODE_TOGGLE = "$DEV$";

interface JoinPageProps {
  sendJsonMessage: SendJsonMessage;
}

const JoinPage = (props: JoinPageProps): React.ReactElement => {
  const [_creatingGame, setCreatingGame] = useAtom(creatingGame);
  const [_checkGameInfo] = useAtom(checkGameInfo);

  let checkGameInfoText = <p></p>;
  if (_checkGameInfo === false) {
    checkGameInfoText = <p>Game not found.</p>;
  } else if (_checkGameInfo && _checkGameInfo !== true) {
    checkGameInfoText = <p>{gameTypeToString(_checkGameInfo.game_type)}</p>;
  }

  const userJoinInfo = getUserJoinInfo();

  useEffect(() => {
    if (userJoinInfo?.code) {
      checkGame(props.sendJsonMessage, userJoinInfo?.code);
    }
  }, []);

  return (
    <>
      <Header size="huge">Writers Block</Header>
      <Formik
        initialValues={{
          joinCode: userJoinInfo?.code ?? "",
          name: userJoinInfo?.name ?? "",
        }}
        validate={(values) => {
          const errors: { [name: string]: string | undefined } = {};
          if (values.joinCode == DEVELOPER_MODE_TOGGLE) {
            // No validation if join code is developer toggle
            return errors;
          }

          if (!values.joinCode) {
            errors.joinCode = "Required";
          } else if (values.joinCode.length != JOIN_CODE_LEN) {
            errors.joinCode = "Join code should be five characters long.";
          }

          if (!values.name) {
            errors.name = "Required";
          } else if (values.name.length > 16) {
            errors.name =
              "Name should be between 1 and 16 characters in length.";
          }

          return errors;
        }}
        onSubmit={(values, { setSubmitting }) => {
          if (values.joinCode == DEVELOPER_MODE_TOGGLE) {
            setSubmitting(false);
            Store.set(developerModeEnabled, true);
            return;
          }

          joinGame(props.sendJsonMessage, values.joinCode, values.name).then(
            () => {
              setSubmitting(false);
            }
          );
        }}>
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
        }) => (
          <Form onSubmit={handleSubmit}>
            <FormField
              name="joinCode"
              label="Join Code"
              onChange={(e: React.ChangeEvent<any>) => {
                handleChange(e);
                const code = e.target.value as string;
                if (code.length == JOIN_CODE_LEN) {
                  checkGame(props.sendJsonMessage, code);
                } else {
                  Store.set(checkGameInfo, null);
                }
              }}
              onBlur={handleBlur}
              value={values.joinCode}
              control={Input}
              placeholder="Join Code"
              error={
                errors.joinCode &&
                touched.joinCode && {
                  content: errors.joinCode,
                  pointing: "above",
                }
              }
            />
            {checkGameInfoText}
            <FormField
              name="name"
              label="Name"
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.name}
              control={Input}
              placeholder="Name"
              error={
                errors.name &&
                touched.name && {
                  content: errors.name,
                  pointing: "above",
                }
              }
            />
            <Grid>
              <GridRow>
                <GridColumn width={2}>
                  <FormField
                    control={Button}
                    primary
                    type="Submit"
                    disabled={isSubmitting || _creatingGame}
                    content={
                      userJoinInfo?.code &&
                      userJoinInfo?.name &&
                      _checkGameInfo &&
                      _checkGameInfo !== true &&
                      _checkGameInfo.should_rejoin
                        ? "Reconnect"
                        : "Join"
                    }
                  />
                </GridColumn>
                <GridColumn width={10} />
                <GridColumn width={4}>
                  <Button
                    onClick={() => {
                      setCreatingGame(true);
                      hostGame(props.sendJsonMessage);
                    }}
                    floated="right"
                    secondary
                    disabled={_creatingGame}>
                    Host Game
                  </Button>
                </GridColumn>
              </GridRow>
            </Grid>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default JoinPage;
