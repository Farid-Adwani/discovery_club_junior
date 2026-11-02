import React from 'react';
import { createPortal } from 'react-dom';

/** Renders a modal overlay on <body>, so a transformed ancestor (hover cards, page transitions) can't trap or clip it */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(children, document.body);
