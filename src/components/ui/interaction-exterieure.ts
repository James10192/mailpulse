import type * as React from "react";
import type { RefObject } from "react";

/**
 * An « outside » click that happened inside the modal's own frame must not
 * close it.
 *
 * While a Radix select is open, it disables pointer events on the rest of the
 * page. Clicking its trigger again closes the list, but that click is
 * delivered to an element outside the modal: the modal read it as an outside
 * click and closed, taking the user's form with it. The pointer position is
 * the only reliable witness: if it falls within the modal, the user was
 * working in it.
 */
type InteractionExterieure = {
  preventDefault(): void;
  detail: { originalEvent: { clientX: number; clientY: number } };
};

export function ignorerClicDansLeCadre<E extends InteractionExterieure>(
  cadre: RefObject<HTMLElement | null>,
  handler?: (event: E) => void,
) {
  return (event: E) => {
    const rect = cadre.current?.getBoundingClientRect();
    const { clientX, clientY } = event.detail.originalEvent;
    if (rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      event.preventDefault();
      return;
    }
    handler?.(event);
  };
}

export function composerRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<T | null>).current = node;
    }
  };
}
