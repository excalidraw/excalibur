import React, { useEffect } from 'react';
import { getFormValue } from '../actions/actionProperties';
import { t } from '../i18n';
import './Range.scss';

export type RangeProps = {
  updateData: (value: number) => void;
  appState: any;
  elements: any;
};

export const Range = ({ updateData, appState, elements }: RangeProps) => {
  const rangeRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef<HTMLDivElement>(null);
  const value = getFormValue(
    elements,
    appState,
    (element) => element.opacity,
    true,
    appState.currentItemOpacity
  );
  useEffect(() => {
    if (rangeRef.current && valueRef.current) {
      const rangeElement = rangeRef.current;
      const valueElement = valueRef.current;
      const inputWidth = rangeElement.offsetWidth;
      const thumbWidth = 15; // 15 is the width of the thumb
      const position = (value / 100) * (inputWidth - thumbWidth) + thumbWidth / 2;
      valueElement.style.left = `${position}px`;
      rangeElement.style.background = `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${value}%, var(--button-bg) ${value}%, var(--button-bg) 100%)`;
    }
  }, [value]);
  
  return (
    <label className="control-label">
      {t('labels.opacity')}
      <div className="range-wrapper">
        <input
          ref={rangeRef}
          type="range"
          min="0"
          max="100"
          step="10"
          onChange={(event) => {
            updateData(+event.target.value);
          }}
          value={value}
          className="range-input"
        />
        <div className="value-bubble" ref={valueRef}>{value !== 0 ? value : null}</div>
        <div className="zero-label">0</div>
      </div>
    </label>
  );
};
