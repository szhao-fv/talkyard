/*
 * Copyright (c) 2019 Kaj Magnus Lindberg
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


// Talkyard Tour gives the user a guided tour of the for-the-moment relevant
// features s/he is about to use.
//
// There're many many open source intro tour Javascript libs,
// but none of them had the functionality I needed, (e.g. waiting for the next
// element to appear, or waiting for a click on the highlighted elem,
// but blocking clicks outside, or in other case requiring a Next
// button click instead, and a nice ellipse highligt whose shape
// and position I can tweak if needed)
// and most of them were a bit bloated, I mean, many many lines of code
// or even bringing in jQuery. So in the end, I created this lib, Talkyard Tour
// instead. (Just 70% LOC size of the smallest other tour lib I could find
// (namely https://github.com/callahanrts/tiny-tour) (ignoring Typescript defs)).


//------------------------------------------------------------------------------
   namespace debiki2.utils {
//------------------------------------------------------------------------------

let tourElem;
let startNewTour;

export function maybeRunTour(tour: TalkyardTour) {
  if (!tourElem) {
    tourElem = ReactDOM.render(React.createFactory(TalkyardTour)(), utils.makeMountNode());
  }
  setTimeout(function() {
    startNewTour(tour);
  }, 100);
}


function TalkyardTour() {
  const [tour, setTour] = React.useState(null);
  const [nextStepIx, setNextStep] = React.useState(0);
  const [elemVisible, setElemVisible] = React.useState(false);
  const tourHighlightRef = React.useRef(null);
  const tourDialogRef = React.useRef(null);

  React.useEffect(doWhenPlaceAtElemVisible);

  function doWhenPlaceAtElemVisible() {
    if (!tour) return;
    const step = tour.steps[nextStepIx];
    const placeAtElem: HTMLElement = $first(step.placeAt);  // [27KAH5]
    const highlightElem: HTMLElement = tourHighlightRef.current;

    if (!placeAtElem) {
      setTimeout(doWhenPlaceAtElemVisible, 1000);
      // Remove highlighting, until new elem appears.
      highlightElem.style.padding = '0px';
      return;
    }

    // Does nothing if already visible.
    setElemVisible(true);

    const placeAtRect = placeAtElem.getBoundingClientRect();

    const dialogElem: HTMLElement = tourDialogRef.current;
    const dialogWidth = dialogElem.clientWidth;
    const dialogHeight = dialogElem.clientHeight;

    let left;
    let top;
    let highlight = true;
    const extraPadding = 13;

    switch (step.placeHow) {
      case PlaceHow.ToTheLeft:
        left = placeAtRect.left - dialogWidth - 2 * extraPadding;
        top = placeAtRect.top + placeAtRect.height / 2 - dialogHeight / 2;
        break;
      case PlaceHow.ToTheRight:
        left = placeAtRect.left + placeAtRect.width + 2 * extraPadding;
        top = placeAtRect.top + placeAtRect.height / 2 - dialogHeight / 2;
        break;
      case PlaceHow.Above:
        left = placeAtRect.left + placeAtRect.width / 2 - dialogWidth / 2;
        top = placeAtRect.top - dialogHeight - 2 * extraPadding;
        break;
      case PlaceHow.Below:
        left = placeAtRect.left + placeAtRect.width / 2 - dialogWidth / 2;
        top = placeAtRect.top + placeAtRect.height + 2 * extraPadding;
        break;
      default:
        left = placeAtRect.left + placeAtRect.width / 2 - dialogWidth / 2;
        top = placeAtRect.top + placeAtRect.height / 2 - dialogHeight / 2;
        highlight = false;
    }
    dialogElem.style.left = left + 'px';
    dialogElem.style.top = top + 'px';

    if (highlight) {
      // This, + a 100vmax border with 50% radius, creates an ellipse centered around
      // the elem to highlight.
      const offsetX = step.highlightOffsetX || 0;
      const offsetY = step.highlightOffsetY || 0;
      highlightElem.style.left = placeAtRect.left + placeAtRect.width / 2 + offsetX + 'px';
      highlightElem.style.top = placeAtRect.top + placeAtRect.height / 2 + offsetY + 'px';
      const padding = step.highlightPadding || extraPadding;
      highlightElem.style.padding =
          `${placeAtRect.height / 2 + padding}px ${placeAtRect.width / 2 + padding}px`;
    }
    else {
      highlightElem.style.left = '0px';
      highlightElem.style.top = '0px';
      highlightElem.style.padding = '0px';
    }

    // Ignore clicks outside the highlighted area.
    // The maths here is confusing? because style.right is the distance from the right edge
    // of the display — but placeAtRect.right is the distance from the *left* edge (although both
    // are named `.right`).
    $first('.s_Tour_ClickBlocker-Left').style.right = (window.innerWidth - placeAtRect.left) + 'px';
    $first('.s_Tour_ClickBlocker-Right').style.left = placeAtRect.right + 'px';
    $first('.s_Tour_ClickBlocker-Above').style.bottom = (window.innerHeight - placeAtRect.top) + 'px';
    $first('.s_Tour_ClickBlocker-Below').style.top = placeAtRect.bottom + 'px';

    if (step.waitForClick) {
      placeAtElem.addEventListener('click', callNextAndUnregister);
    }

    function callNextAndUnregister() {
      placeAtElem.removeEventListener('click', callNextAndUnregister);
      goToNextStep();
    }
  }

  if (!startNewTour) startNewTour = (tour: TalkyardTour) => {
    setTour(tour);
    const nextStepIx = tour.forWho.tourTipsStates[tour.id];
    setNextStep(nextStepIx);
  }

  if (!tour)
    return null;

  const step = tour.steps[nextStepIx];
  if (!step)
    return r.div({ className: 'e_NoTour' });

  function goToNextStep() {
    setElemVisible(false);
    setNextStep(nextStepIx + 1);
    // This updates the state in place. Fine, in this case.  [redux]
    tour.forWho.tourTipsStates[tour.id] = nextStepIx;
    page.PostsReadTracker.saveTourTipsStates(tour.forWho.tourTipsStates);
  }

  function goToPrevStep() {
    setElemVisible(false);
    setNextStep(nextStepIx - 1);
  }

  function exitTour() {
    setTour(null);
  }

  function maybeGoNextOnElemClick(event: Event) {
    if (!step.waitForClick) return;
    event.target
    goToNextStep();
  }

  const highlightStyle = step.waitForClick && elemVisible ? { pointerEvents: 'none' } : null;
  const dialogVisiblilityStyle = { visibility: (elemVisible ? null : 'hidden') };
  const nextDisabled = step.waitForClick;
  const isLastStep = nextStepIx === tour.steps.length - 1;

  return r.div({ className: 's_Tour' },
    r.div({ className: 's_Tour_Highlight', ref: tourHighlightRef,
        onClick: maybeGoNextOnElemClick, style: highlightStyle }),
    r.div({ className: 's_Tour_ClickBlocker-Left' }),
    r.div({ className: 's_Tour_ClickBlocker-Right' }),
    r.div({ className: 's_Tour_ClickBlocker-Above' }),
    r.div({ className: 's_Tour_ClickBlocker-Below' }),
    r.div({ className: 's_Tour_D', ref: tourDialogRef, style: dialogVisiblilityStyle },
      r.h3({ className: 's_Tour_D_Ttl' }, step.title),
      r.p({ className: 's_Tour_D_Txt' }, step.text),
      r.div({ className: 's_Tour_D_Bs' },
        PrimaryButton({ onClick: goToNextStep, className: 's_Tour_D_Bs_NextB',
            disabled: nextDisabled }, isLastStep ? "Goodbye" : "Next"), // I18N
        Button({ onClick: goToPrevStep, className: 's_Tour_D_Bs_PrevB'  }, "Prev"),        // I18N
        r.div({ className: 's_Tour_D_Bs_Ix' }, `${nextStepIx + 1}/${tour.steps.length}`),
        isLastStep ? null :
            Button({ onClick: exitTour, className: 's_Tour_D_Bs_ExitB'  }, "Goodbye"),         // I18N
        )));
}


//------------------------------------------------------------------------------
   }
//------------------------------------------------------------------------------