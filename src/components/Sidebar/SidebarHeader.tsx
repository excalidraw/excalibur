import clsx from "clsx";
import { useContext } from "react";
import { t } from "../../i18n";
import { useDevice } from "../App";
import { SidebarPropsContext } from "./common";
import { CloseIcon, PinIcon } from "../icons";
import { Tooltip } from "../Tooltip";
import { Button } from "../Button";

export const SidebarHeader = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const device = useDevice();
  const props = useContext(SidebarPropsContext);

  const renderDockButton = !!(
    device.canDeviceFitSidebar && props.shouldRenderDockButton
  );

  return (
    <div
      className={clsx("layer-ui__sidebar__header", className)}
      data-testid="sidebar-header"
    >
      {children}
      <div className="layer-ui__sidebar__header__buttons">
        {renderDockButton && (
          <Tooltip label={t("labels.sidebarLock")}>
            <Button
              onSelect={() => props.onDock?.(!props.docked)}
              selected={!!props.docked}
              className="Sidebar__pin-btn"
              data-testid="sidebar-dock"
              aria-label={t("labels.sidebarLock")}
            >
              {PinIcon}
            </Button>
          </Tooltip>
        )}
        <Button
          data-testid="sidebar-close"
          className="Sidebar__close-btn"
          onSelect={props.onCloseRequest}
          aria-label={t("buttons.close")}
        >
          {CloseIcon}
        </Button>
      </div>
    </div>
  );
};

SidebarHeader.displayName = "SidebarHeader";
