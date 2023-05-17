import { useState } from 'react';
import {
  Card,
  CardRank,
  CardDeck,
  CardSuit,
  GameState,
  Hand,
  GameResult,
} from './types';

//UI Elements
const CardBackImage = () => (
  <img src={process.env.PUBLIC_URL + `/SVG-cards/png/1x/back.png`} />
);

const CardImage = ({ suit, rank }: Card) => {
  const card = rank === CardRank.Ace ? 1 : rank;
  return (
    <img
      key={`/SVG-cards/png/1x/${suit.slice(0, -1)}_${card}.png`}
      src={
        process.env.PUBLIC_URL +
        `/SVG-cards/png/1x/${suit.slice(0, -1)}_${card}.png`
      }
    />
  );
};

//Setup
const newCardDeck = (): CardDeck =>
  Object.values(CardSuit)
    .map((suit) =>
      Object.values(CardRank).map((rank) => ({
        suit,
        rank,
      }))
    )
    .reduce((a, v) => [...a, ...v]);

const shuffle = (deck: CardDeck): CardDeck => {
  return deck.sort(() => Math.random() - 0.5);
};

const takeCard = (deck: CardDeck): { card: Card; remaining: CardDeck } => {
  const card = deck[deck.length - 1];
  const remaining = deck.slice(0, deck.length - 1);
  return { card, remaining };
};

const setupGame = (): GameState => {
  const cardDeck = shuffle(newCardDeck());
  return {
    playerHand: cardDeck.slice(cardDeck.length - 2, cardDeck.length),
    dealerHand: cardDeck.slice(cardDeck.length - 4, cardDeck.length - 2),
    cardDeck: cardDeck.slice(0, cardDeck.length - 4), // remaining cards after player and dealer have been give theirs
    turn: 'player_turn',
  };
};

// Scoring
const calculateHandScore = (hand: Hand): number => {
  // filter aces into an array
  const aces = hand.filter((card) => card.rank === 'ace');
  // filter non aces into another array
  const nonAces = hand.filter((card) => card.rank !== 'ace');
  // set a variable to track the hand values
  let handValues = 0;

  // Calculate the sum of non-ace cards
  handValues += nonAces.reduce((sum, card) => {
    // ensure we're correctly valuing kings, queens, and jacks as 10
    if (card.rank === 'king' || card.rank === 'queen' || card.rank === 'jack') {
      return sum + 10;
    } else {
      // all other cards just return their value as a number, not a string
      return sum + Number(card.rank);
    }
  }, 0);

  const numAces = aces.length;
  // set a variable to track ace count
  let aceCount = 0;
  // Calculate the sum of ace cards
  for (let i = 0; i < numAces; i++) {
    if (handValues + 11 <= 21 - (numAces - aceCount - 1)) {
      handValues += 11;
      aceCount++;
    } else {
      handValues += 1;
    }
  }

  return handValues;
};

const determineGameResult = (state: GameState): GameResult => {
  // we need to define the blackjack hand to ensure we're accounting for it correctly
  const blackJack: Hand = [
    { suit: CardSuit.Clubs, rank: CardRank.Ace },
    { suit: CardSuit.Clubs, rank: CardRank.King },
  ];

  // checking to see if the player's hand is blackjack
  const isPlayerBlackJack =
    JSON.stringify(state.playerHand) === JSON.stringify(blackJack);
  // checking to see if the dealer's hand is blackjack
  const isDealerBlackJack =
    JSON.stringify(state.dealerHand) === JSON.stringify(blackJack);

  // player wins if they have blackjack hand
  if (isPlayerBlackJack && !isDealerBlackJack) {
    return 'player_win';
    // dealer wins if they have blackjack hand
  } else if (isDealerBlackJack && !isPlayerBlackJack) {
    return 'dealer_win';
  }

  // calculature both the player and dealer's score
  const playerScore = calculateHandScore(state.playerHand);
  const dealerScore = calculateHandScore(state.dealerHand);

  // if player goes over 21 and busts, dealer wins
  if (playerScore > 21) {
    return 'dealer_win';
    // if dealer goes over 21 and busts, player wins
  } else if (dealerScore > 21) {
    return 'player_win';
    // if player gets 21 and dealer doesn't, player wins
  } else if (playerScore === 21 && dealerScore !== 21) {
    return 'player_win';
    // if dealer has a higher score, dealer wins
  } else if (dealerScore > playerScore) {
    return 'dealer_win';
    // if player has a higher score, player wins
  } else if (playerScore > dealerScore) {
    return 'player_win';
    // otherwise, return a draw
  } else {
    return 'draw';
  }
};

// Player Actions
const playerStands = (state: GameState): GameState => {
  let newState = { ...state };

  // Dealer takes cards until their score is 17 or higher
  while (calculateHandScore(newState.dealerHand) <= 16) {
    const { card, remaining } = takeCard(newState.cardDeck);
    newState.cardDeck = remaining;
    newState.dealerHand.push(card);
  }

  // Determine the game result
  const playerScore = calculateHandScore(newState.playerHand);
  const dealerScore = calculateHandScore(newState.dealerHand);
  let gameResult;

  // if dealer busts, or player score is > dealer score, player wins
  if (dealerScore > 21 || playerScore > dealerScore) {
    gameResult = 'player_win';
    // if player score is less than dealer score, dealer wins
  } else if (playerScore < dealerScore) {
    gameResult = 'dealer_win';
    // otherwise it's a draw
  } else {
    gameResult = 'draw';
  }

  // Update the turn to 'dealer_turn'
  newState.turn = 'dealer_turn';

  return newState;
};

const playerHits = (state: GameState): GameState => {
  const { card, remaining } = takeCard(state.cardDeck);
  return {
    ...state,
    cardDeck: remaining,
    playerHand: [...state.playerHand, card],
  };
};

//UI Component
const Game = (): JSX.Element => {
  const [state, setState] = useState(setupGame());

  return (
    <>
      <div>
        <p>There are {state.cardDeck.length} cards left in deck</p>
        <button
          disabled={state.turn === 'dealer_turn'}
          onClick={(): void => setState(playerHits)}
        >
          Hit
        </button>
        <button
          disabled={state.turn === 'dealer_turn'}
          onClick={(): void => setState(playerStands)}
        >
          Stand
        </button>
        <button onClick={(): void => setState(setupGame())}>Reset</button>
      </div>
      <p>Player Cards</p>
      <div>
        {state.playerHand.map(CardImage)}
        <p>Player Score {calculateHandScore(state.playerHand)}</p>
      </div>
      <p>Dealer Cards</p>
      {state.turn === 'player_turn' && state.dealerHand.length > 0 ? (
        <div>
          <CardBackImage />
          <CardImage {...state.dealerHand[1]} />
        </div>
      ) : (
        <div>
          {state.dealerHand.map(CardImage)}
          <p>Dealer Score {calculateHandScore(state.dealerHand)}</p>
        </div>
      )}
      {state.turn === 'dealer_turn' &&
      determineGameResult(state) !== 'no_result' ? (
        <p>{determineGameResult(state)}</p>
      ) : (
        <p>{state.turn}</p>
      )}
    </>
  );
};

export {
  Game,
  playerHits,
  playerStands,
  determineGameResult,
  calculateHandScore,
  setupGame,
};
