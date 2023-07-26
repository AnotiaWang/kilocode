import styled from "styled-components";
import {
  defaultBorderRadius,
  vscBackground,
  vscForeground,
} from "../components";
import Loader from "../components/Loader";
import ContinueButton from "../components/ContinueButton";
import { FullState, HighlightedRangeContext } from "../../../schema/FullState";
import { useCallback, useEffect, useRef, useState, useContext } from "react";
import { History } from "../../../schema/History";
import { HistoryNode } from "../../../schema/HistoryNode";
import StepContainer from "../components/StepContainer";
import { GUIClientContext } from "../App";
import {
  BookOpen,
  ChatBubbleOvalLeftEllipsis,
  Trash,
} from "@styled-icons/heroicons-outline";
import ComboBox from "../components/ComboBox";
import TextDialog from "../components/TextDialog";
import HeaderButtonWithText from "../components/HeaderButtonWithText";
import ReactSwitch from "react-switch";
import { usePostHog } from "posthog-js/react";
import { useSelector } from "react-redux";
import { RootStore } from "../redux/store";
import { postVscMessage } from "../vscode";
import UserInputContainer from "../components/UserInputContainer";
import Onboarding from "../components/Onboarding";
import { isMetaEquivalentKeyPressed } from "../util";

const TopGUIDiv = styled.div`
  overflow: hidden;
`;

const UserInputQueueItem = styled.div`
  border-radius: ${defaultBorderRadius};
  color: gray;
  padding: 8px;
  margin: 8px;
  text-align: center;
`;

const Footer = styled.footer<{ dataSwitchChecked: boolean }>`
  display: flex;
  flex-direction: row;
  gap: 8px;
  justify-content: right;
  padding: 8px;
  align-items: center;
  margin-top: 8px;
  border-top: 0.1px solid gray;
  background-color: ${(props) =>
    props.dataSwitchChecked ? "#12887a33" : "transparent"};
`;

interface GUIProps {
  firstObservation?: any;
}

function GUI(props: GUIProps) {
  const client = useContext(GUIClientContext);
  const posthog = usePostHog();
  const vscMachineId = useSelector(
    (state: RootStore) => state.config.vscMachineId
  );
  const vscMediaUrl = useSelector(
    (state: RootStore) => state.config.vscMediaUrl
  );
  const [dataSwitchChecked, setDataSwitchChecked] = useState(false);
  const dataSwitchOn = useSelector(
    (state: RootStore) => state.config.dataSwitchOn
  );

  useEffect(() => {
    if (typeof dataSwitchOn !== "undefined") {
      setDataSwitchChecked(dataSwitchOn);
    }
  }, [dataSwitchOn]);

  const [waitingForSteps, setWaitingForSteps] = useState(false);
  const [userInputQueue, setUserInputQueue] = useState<string[]>([]);
  const [highlightedRanges, setHighlightedRanges] = useState<
    HighlightedRangeContext[]
  >([]);
  const [addingHighlightedCode, setAddingHighlightedCode] = useState(false);
  const [availableSlashCommands, setAvailableSlashCommands] = useState<
    { name: string; description: string }[]
  >([]);
  const [pinned, setPinned] = useState(false);
  const [showDataSharingInfo, setShowDataSharingInfo] = useState(false);
  const [stepsOpen, setStepsOpen] = useState<boolean[]>([
    true,
    true,
    true,
    true,
  ]);
  const [history, setHistory] = useState<History | undefined>({
    timeline: [
      {
        step: {
          name: "Welcome to Continue",
          hide: false,
          description: `- Highlight code and ask a question or give instructions
          - Use \`cmd+m\` (Mac) / \`ctrl+m\` (Windows) to open Continue
          - Use \`/help\` to ask questions about how to use Continue`,
          system_message: null,
          chat_context: [],
          manage_own_chat_context: false,
          message: "",
        },
        depth: 0,
        deleted: false,
        active: false,
      },
    ],
    current_index: 3,
  } as any);

  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackDialogMessage, setFeedbackDialogMessage] = useState("");
  const [feedbackEntryOn, setFeedbackEntryOn] = useState(true);

  const topGuiDivRef = useRef<HTMLDivElement>(null);

  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const scrollToBottom = useCallback(() => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    // Debounced smooth scroll to bottom of screen
    if (topGuiDivRef.current) {
      const timeout = setTimeout(() => {
        window.scrollTo({
          top: topGuiDivRef.current!.offsetHeight,
          behavior: "smooth",
        });
      }, 200);
      setScrollTimeout(timeout);
    }
  }, [topGuiDivRef.current, scrollTimeout]);

  useEffect(() => {
    // Cmd + Backspace to delete current step
    const listener = (e: any) => {
      if (
        e.key === "Backspace" &&
        isMetaEquivalentKeyPressed(e) &&
        typeof history?.current_index !== "undefined" &&
        history.timeline[history.current_index]?.active
      ) {
        client?.deleteAtIndex(history.current_index);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [client, history]);

  useEffect(() => {
    client?.onStateUpdate((state: FullState) => {
      // Scroll only if user is at very bottom of the window.
      const shouldScrollToBottom =
        topGuiDivRef.current &&
        topGuiDivRef.current?.offsetHeight - window.scrollY < 100;

      const waitingForSteps =
        state.active &&
        state.history.current_index < state.history.timeline.length &&
        state.history.timeline[state.history.current_index] &&
        state.history.timeline[
          state.history.current_index
        ].step.description?.trim() === "";

      setWaitingForSteps(waitingForSteps);
      setHistory(state.history);
      setHighlightedRanges(state.highlighted_ranges);
      setUserInputQueue(state.user_input_queue);
      setAddingHighlightedCode(state.adding_highlighted_code);
      setAvailableSlashCommands(
        state.slash_commands.map((c: any) => {
          return {
            name: `/${c.name}`,
            description: c.description,
          };
        })
      );
      setStepsOpen((prev) => {
        const nextStepsOpen = [...prev];
        for (
          let i = nextStepsOpen.length;
          i < state.history.timeline.length;
          i++
        ) {
          nextStepsOpen.push(true);
        }
        return nextStepsOpen;
      });

      if (shouldScrollToBottom) {
        scrollToBottom();
      }
    });
  }, [client]);

  useEffect(() => {
    scrollToBottom();
  }, [waitingForSteps]);

  const mainTextInputRef = useRef<HTMLInputElement>(null);

  const deleteContextItems = useCallback(
    (indices: number[]) => {
      client?.deleteContextAtIndices(indices);
    },
    [client]
  );

  const onMainTextInput = (event?: any) => {
    if (mainTextInputRef.current) {
      let input = (mainTextInputRef.current as any).inputValue;
      // cmd+enter to /edit
      if (isMetaEquivalentKeyPressed(event)) {
        input = `/edit ${input}`;
      }
      (mainTextInputRef.current as any).setInputValue("");
      if (!client) return;

      setWaitingForSteps(true);

      if (
        history &&
        history.current_index >= 0 &&
        history.current_index < history.timeline.length
      ) {
        if (
          history.timeline[history.current_index]?.step.name ===
          "Waiting for user input"
        ) {
          if (input.trim() === "") return;
          onStepUserInput(input, history!.current_index);
          return;
        } else if (
          history.timeline[history.current_index]?.step.name ===
          "Waiting for user confirmation"
        ) {
          onStepUserInput("ok", history!.current_index);
          return;
        }
      }
      if (input.trim() === "") return;

      client.sendMainInput(input);
      setUserInputQueue((queue) => {
        return [...queue, input];
      });
    }
  };

  const onStepUserInput = (input: string, index: number) => {
    if (!client) return;
    client.sendStepUserInput(input, index);
  };

  // const iterations = useSelector(selectIterations);
  return (
    <>
      <Onboarding />
      <TextDialog
        showDialog={showFeedbackDialog}
        onEnter={(text) => {
          client?.sendMainInput(`/feedback ${text}`);
          setShowFeedbackDialog(false);
        }}
        onClose={() => {
          setShowFeedbackDialog(false);
        }}
        message={feedbackDialogMessage}
        entryOn={feedbackEntryOn}
      />

      <TopGUIDiv
        ref={topGuiDivRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            onMainTextInput();
          }
        }}
      >
        {typeof client === "undefined" && (
          <>
            <Loader />
            <p style={{ textAlign: "center" }}>Loading Continue server...</p>
          </>
        )}
        {history?.timeline.map((node: HistoryNode, index: number) => {
          return node.step.name === "User Input" ? (
            node.step.hide || (
              <UserInputContainer
                onDelete={() => {
                  client?.deleteAtIndex(index);
                }}
                historyNode={node}
              >
                {node.step.description as string}
              </UserInputContainer>
            )
          ) : (
            <StepContainer
              index={index}
              isLast={index === history.timeline.length - 1}
              isFirst={index === 0}
              open={stepsOpen[index]}
              onToggle={() => {
                const nextStepsOpen = [...stepsOpen];
                nextStepsOpen[index] = !nextStepsOpen[index];
                setStepsOpen(nextStepsOpen);
              }}
              onToggleAll={() => {
                const shouldOpen = !stepsOpen[index];
                setStepsOpen((prev) => prev.map(() => shouldOpen));
              }}
              key={index}
              onUserInput={(input: string) => {
                onStepUserInput(input, index);
              }}
              inFuture={index > history?.current_index}
              historyNode={node}
              onReverse={() => {
                client?.reverseToIndex(index);
              }}
              onRetry={() => {
                client?.retryAtIndex(index);
                setWaitingForSteps(true);
              }}
              onDelete={() => {
                client?.deleteAtIndex(index);
              }}
            />
          );
        })}
        {waitingForSteps && <Loader></Loader>}

        <div>
          {userInputQueue.map((input) => {
            return <UserInputQueueItem>{input}</UserInputQueueItem>;
          })}
        </div>

        <ComboBox
          ref={mainTextInputRef}
          onEnter={(e) => {
            onMainTextInput(e);
            e.stopPropagation();
            e.preventDefault();
          }}
          onInputValueChange={() => {}}
          items={availableSlashCommands}
          highlightedCodeSections={highlightedRanges}
          deleteContextItems={deleteContextItems}
          onTogglePin={() => {
            setPinned((prev: boolean) => !prev);
          }}
          onToggleAddContext={() => {
            client?.toggleAddingHighlightedCode();
          }}
          addingHighlightedCode={addingHighlightedCode}
        />
        <ContinueButton onClick={onMainTextInput} />
      </TopGUIDiv>
      <div
        style={{
          position: "fixed",
          bottom: "50px",
          backgroundColor: vscBackground,
          color: vscForeground,
          borderRadius: defaultBorderRadius,
          padding: "16px",
          margin: "16px",
          zIndex: 100,
          boxShadow: `0px 0px 10px 0px ${vscForeground}`,
        }}
        hidden={!showDataSharingInfo}
      >
        By turning on this switch, you will begin collecting accepted and
        rejected suggestions in .continue/suggestions.json. This data is stored
        locally on your machine and not sent anywhere.
        <br />
        <br />
        <b>
          {dataSwitchChecked
            ? "👍 Data is being collected"
            : "👎 No data is being collected"}
        </b>
      </div>
      <Footer dataSwitchChecked={dataSwitchChecked}>
        {vscMediaUrl && (
          <a
            href="https://github.com/continuedev/continue"
            style={{ marginRight: "auto" }}
          >
            <img src={`${vscMediaUrl}/continue-dev-square.png`} width="22px" />
          </a>
        )}
        {/* <p style={{ margin: "0", marginRight: "auto" }}>Continue</p> */}
        <HeaderButtonWithText
          onClick={() => {
            // Show the dialog
            setFeedbackDialogMessage(
              `Continue uses GPT-4 by default, but works with any model. If you'd like to keep your code completely private, there are few options:

Run a local model with ggml: [5 minute quickstart](https://github.com/continuedev/ggml-server-example)

Use Azure OpenAI service, which is GDPR and HIPAA compliant: [Tutorial](https://continue.dev/docs/customization#azure-openai-service)

If you already have an LLM deployed on your own infrastructure, or would like to do so, please contact us at hi@continue.dev.
              `
            );
            setFeedbackEntryOn(false);
            setShowFeedbackDialog(true);
          }}
          text={"Use Private Model"}
        >
          <div
            style={{ fontSize: "18px", marginLeft: "2px", marginRight: "2px" }}
          >
            🔒
          </div>
        </HeaderButtonWithText>
        <HeaderButtonWithText
          onClick={() => {
            client?.sendClear();
          }}
          text="Clear"
        >
          <Trash size="1.6em" />
        </HeaderButtonWithText>
        <a
          href="https://continue.dev/docs/how-to-use-continue"
          className="no-underline"
        >
          <HeaderButtonWithText text="Docs">
            <BookOpen size="1.6em" />
          </HeaderButtonWithText>
        </a>
        <HeaderButtonWithText
          onClick={() => {
            // Set dialog open
            setFeedbackDialogMessage(
              "Having trouble using Continue? Want a new feature? Let us know! This box is anonymous, but we will promptly address your feedback."
            );
            setFeedbackEntryOn(true);
            setShowFeedbackDialog(true);
          }}
          text="Feedback"
        >
          <ChatBubbleOvalLeftEllipsis size="1.6em" />
        </HeaderButtonWithText>
      </Footer>
    </>
  );
}

export default GUI;
