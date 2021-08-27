import React from "react";
import { t } from "../i18n";
import { isDarwin, isWindows } from "../keys";
import { Dialog } from "./Dialog";
import { getShortcutKey } from "../utils";
import "./HelpDialog.scss";

const Header = () => (
  <div className="HelpDialog--header">
    <a
      className="HelpDialog--btn"
      href="https://blog.excalidraw.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      {t("helpDialog.blog")}
    </a>
    <a
      className="HelpDialog--btn"
      href="https://github.com/excalidraw/excalidraw/issues"
      target="_blank"
      rel="noopener noreferrer"
    >
      {t("helpDialog.github")}
    </a>
  </div>
);

const Section = (props: { title: string; children: React.ReactNode }) => (
  <>
    <h3>{props.title}</h3>
    {props.children}
  </>
);

const Columns = (props: { children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    }}
  >
    {props.children}
  </div>
);

const Column = (props: { children: React.ReactNode }) => (
  <div style={{ width: "49%" }}>{props.children}</div>
);

const ShortcutIsland = (props: {
  caption: string;
  children: React.ReactNode;
}) => (
  <div className="HelpDialog--island">
    <h3 className="HelpDialog--island-title">{props.caption}</h3>
    {props.children}
  </div>
);

const Shortcut = (props: {
  label: string;
  shortcuts: string[];
  isOr: boolean;
}) => {
  return (
    <div className="HelpDialog--shortcut">
      <div
        style={{
          display: "flex",
          margin: "0",
          padding: "4px 8px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            lineHeight: 1.4,
          }}
        >
          {props.label}
        </div>
        <div
          style={{
            display: "flex",
            flex: "0 0 auto",
            justifyContent: "flex-end",
            marginInlineStart: "auto",
            minWidth: "30%",
          }}
        >
          {props.shortcuts.map((shortcut, index) => (
            <React.Fragment key={index}>
              <ShortcutKey>{shortcut}</ShortcutKey>
              {props.isOr &&
                index !== props.shortcuts.length - 1 &&
                t("helpDialog.or")}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

Shortcut.defaultProps = {
  isOr: true,
};

const ShortcutKey = (props: { children: React.ReactNode }) => (
  <kbd className="HelpDialog--key" {...props} />
);

export const HelpDialog = ({ onClose }: { onClose?: () => void }) => {
  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      <Dialog
        onCloseRequest={handleClose}
        title={t("helpDialog.title")}
        className={"HelpDialog"}
      >
        <Header />
        <Section title={t("helpDialog.shortcuts")}>
          <Columns>
            <Column>
              <ShortcutIsland caption={t("helpDialog.shapes")}>
                <Shortcut
                  label={t("toolBar.selection")}
                  shortcuts={["V", "1"]}
                />
                <Shortcut
                  label={t("toolBar.rectangle")}
                  shortcuts={["R", "2"]}
                />
                <Shortcut label={t("toolBar.diamond")} shortcuts={["D", "3"]} />
                <Shortcut label={t("toolBar.ellipse")} shortcuts={["E", "4"]} />
                <Shortcut label={t("toolBar.arrow")} shortcuts={["A", "5"]} />
                <Shortcut label={t("toolBar.line")} shortcuts={["P", "6"]} />
                <Shortcut
                  label={t("toolBar.freedraw")}
                  shortcuts={["Shift+P", "7"]}
                />
                <Shortcut label={t("toolBar.text")} shortcuts={["T", "8"]} />
                <Shortcut
                  label={t("helpDialog.editSelectedShape")}
                  shortcuts={[
                    getShortcutKey("Enter"),
                    t("helpDialog.doubleClick"),
                  ]}
                />
                <Shortcut
                  label={t("helpDialog.textNewLine")}
                  shortcuts={[
                    getShortcutKey("Enter"),
                    getShortcutKey("Shift+Enter"),
                  ]}
                />
                <Shortcut
                  label={t("helpDialog.textFinish")}
                  shortcuts={[
                    getShortcutKey("Esc"),
                    getShortcutKey("CtrlOrCmd+Enter"),
                  ]}
                />
                <Shortcut
                  label={t("helpDialog.curvedArrow")}
                  shortcuts={[
                    "A",
                    t("helpDialog.click"),
                    t("helpDialog.click"),
                    t("helpDialog.click"),
                  ]}
                  isOr={false}
                />
                <Shortcut
                  label={t("helpDialog.curvedLine")}
                  shortcuts={[
                    "L",
                    t("helpDialog.click"),
                    t("helpDialog.click"),
                    t("helpDialog.click"),
                  ]}
                  isOr={false}
                />
                <Shortcut label={t("toolBar.lock")} shortcuts={["Q"]} />
                <Shortcut
                  label={t("helpDialog.preventBinding")}
                  shortcuts={[getShortcutKey("CtrlOrCmd")]}
                />
              </ShortcutIsland>
              <ShortcutIsland caption={t("helpDialog.view")}>
                <Shortcut
                  label={t("buttons.zoomIn")}
                  shortcuts={[getShortcutKey("CtrlOrCmd++")]}
                />
                <Shortcut
                  label={t("buttons.zoomOut")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+-")]}
                />
                <Shortcut
                  label={t("buttons.resetZoom")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+0")]}
                />
                <Shortcut
                  label={t("helpDialog.zoomToFit")}
                  shortcuts={["Shift+1"]}
                />
                <Shortcut
                  label={t("helpDialog.zoomToSelection")}
                  shortcuts={["Shift+2"]}
                />
                <Shortcut label={t("buttons.fullScreen")} shortcuts={["F"]} />
                <Shortcut
                  label={t("buttons.zenMode")}
                  shortcuts={[getShortcutKey("Alt+Z")]}
                />
                <Shortcut
                  label={t("labels.showGrid")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+'")]}
                />
                <Shortcut
                  label={t("labels.viewMode")}
                  shortcuts={[getShortcutKey("Alt+R")]}
                />
                <Shortcut
                  label={t("labels.toggleTheme")}
                  shortcuts={[getShortcutKey("Alt+Shift+D")]}
                />
                <Shortcut
                  label={t("stats.title")}
                  shortcuts={[getShortcutKey("Alt+/")]}
                />
              </ShortcutIsland>
            </Column>
            <Column>
              <ShortcutIsland caption={t("helpDialog.editor")}>
                <Shortcut
                  label={t("labels.selectAll")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+A")]}
                />
                <Shortcut
                  label={t("labels.multiSelect")}
                  shortcuts={[getShortcutKey(`Shift+${t("helpDialog.click")}`)]}
                />
                <Shortcut
                  label={t("labels.moveCanvas")}
                  shortcuts={[
                    getShortcutKey(`Space+${t("helpDialog.drag")}`),
                    getShortcutKey(`Wheel+${t("helpDialog.drag")}`),
                  ]}
                  isOr={true}
                />
                <Shortcut
                  label={t("labels.cut")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+X")]}
                />
                <Shortcut
                  label={t("labels.copy")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+C")]}
                />
                <Shortcut
                  label={t("labels.paste")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+V")]}
                />
                <Shortcut
                  label={t("labels.copyAsPng")}
                  shortcuts={[getShortcutKey("Shift+Alt+C")]}
                />
                <Shortcut
                  label={t("labels.copyStyles")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Alt+C")]}
                />
                <Shortcut
                  label={t("labels.pasteStyles")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Alt+V")]}
                />
                <Shortcut
                  label={t("labels.delete")}
                  shortcuts={[getShortcutKey("Del")]}
                />
                <Shortcut
                  label={t("labels.sendToBack")}
                  shortcuts={[
                    isDarwin
                      ? getShortcutKey("CtrlOrCmd+Alt+[")
                      : getShortcutKey("CtrlOrCmd+Shift+["),
                  ]}
                />
                <Shortcut
                  label={t("labels.bringToFront")}
                  shortcuts={[
                    isDarwin
                      ? getShortcutKey("CtrlOrCmd+Alt+]")
                      : getShortcutKey("CtrlOrCmd+Shift+]"),
                  ]}
                />
                <Shortcut
                  label={t("labels.sendBackward")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+[")]}
                />
                <Shortcut
                  label={t("labels.bringForward")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+]")]}
                />
                <Shortcut
                  label={t("labels.alignTop")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Shift+Up")]}
                />
                <Shortcut
                  label={t("labels.alignBottom")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Shift+Down")]}
                />
                <Shortcut
                  label={t("labels.alignLeft")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Shift+Left")]}
                />
                <Shortcut
                  label={t("labels.alignRight")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Shift+Right")]}
                />
                <Shortcut
                  label={t("labels.duplicateSelection")}
                  shortcuts={[
                    getShortcutKey("CtrlOrCmd+D"),
                    getShortcutKey(`Alt+${t("helpDialog.drag")}`),
                  ]}
                />
                <Shortcut
                  label={t("buttons.undo")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Z")]}
                />
                <Shortcut
                  label={t("buttons.redo")}
                  shortcuts={
                    isWindows
                      ? [
                          getShortcutKey("CtrlOrCmd+Y"),
                          getShortcutKey("CtrlOrCmd+Shift+Z"),
                        ]
                      : [getShortcutKey("CtrlOrCmd+Shift+Z")]
                  }
                />
                <Shortcut
                  label={t("labels.group")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+G")]}
                />
                <Shortcut
                  label={t("labels.ungroup")}
                  shortcuts={[getShortcutKey("CtrlOrCmd+Shift+G")]}
                />
                <Shortcut
                  label={t("labels.flipHorizontal")}
                  shortcuts={[getShortcutKey("Shift+H")]}
                />
                <Shortcut
                  label={t("labels.flipVertical")}
                  shortcuts={[getShortcutKey("Shift+V")]}
                />
                <Shortcut
                  label={t("labels.showStroke")}
                  shortcuts={[getShortcutKey("S")]}
                />
                <Shortcut
                  label={t("labels.showBackground")}
                  shortcuts={[getShortcutKey("G")]}
                />
              </ShortcutIsland>
            </Column>
          </Columns>
        </Section>
      </Dialog>
    </>
  );
};
