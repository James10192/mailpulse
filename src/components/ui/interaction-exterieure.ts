import type * as React from "react";

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
  detail: { originalEvent: { clientX: number; clientY: number } };
};

export function clicDansLeCadre(cadre: HTMLElement | null, event: InteractionExterieure): boolean {
  const rect = cadre?.getBoundingClientRect();
  if (!rect) return false;
  const { clientX, clientY } = event.detail.originalEvent;

  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

export function composerRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<T | null>).current = node;
    }
  };
}
