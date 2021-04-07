import { Machine, MachineOptions, assign } from 'xstate'
import { BridgeTxStatus } from '@sora-substrate/util'

enum EVENTS {
  SEND_SORA = 'SEND_SORA',
  SEND_ETHEREUM = 'SEND_ETHEREUM',
  RETRY = 'RETRY'
}

enum STATES {
  INITIAL = 'INITIAL',
  SORA_SUBMITTED = 'SORA_SUBMITTED',
  SORA_PENDING = 'SORA_PENDING',
  SORA_REJECTED = 'SORA_REJECTED',
  SORA_COMMITED = 'SORA_COMMITED',
  ETHEREUM_SUBMITTED = 'ETHEREUM_SUBMITTED',
  ETHEREUM_PENDING = 'ETHEREUM_PENDING',
  ETHEREUM_REJECTED = 'ETHEREUM_REJECTED',
  ETHEREUM_COMMITED = 'ETHEREUM_COMMITED'
}

enum ACTIONS {
  SIGN_TRANSACTION = 'SIGN_TRANSACTION',
  SET_TRANSACTION_STATE = 'SET_TRANSACTION_STATE',
  SET_SECOND_TRANSACTION_STEP = 'SET_SECOND_TRANSACTION_STEP',
  SET_SORA_TRANSACTION_HASH = 'SET_SORA_TRANSACTION_HASH',
  SET_ETHEREUM_TRANSACTION_HASH = 'SET_ETHEREUM_TRANSACTION_HASH',
  SET_BRIDGE_STATUS_PENDING = 'SET_BRIDGE_STATUS_PENDING',
  SET_BRIDGE_STATUS_FAILURE = 'SET_BRIDGE_STATUS_FAILURE',
  SET_BRIDGE_STATUS_DONE = 'SET_BRIDGE_STATUS_DONE'
}

enum SERVICES {
  SIGN_SORA_TRANSACTION = 'SIGN_SORA_TRANSACTION',
  CHECK_SORA_TRANSACTION = 'CHECK_SORA_TRANSACTION',
  SIGN_ETHEREUM_TRANSACTION = 'SIGN_ETHEREUM_TRANSACTION',
  CHECK_ETHEREUM_TRANSACTION = 'CHECK_ETHEREUM_TRANSACTION'
}

interface SoraEthFlow {
  sora: {
    sign: ({ txId: string }) => Promise<any>;
    send: ({ txId: string }) => Promise<any>;
  };
  ethereum: {
    sign: ({ hash: string }) => Promise<any>;
    send: ({ ethereumHash: string }) => Promise<any>;
  };
}
interface EthSoraFlow {
  ethereum: {
    sign: () => Promise<any>;
    send: ({ ethereumHash: string }) => Promise<any>;
  };
  sora: {
    sign: ({ ethereumHash: string }) => Promise<any>;
    send: ({ ethereumHash: string }) => Promise<any>;
  };
}
interface Context {
  history: any;
  SORA_ETH: SoraEthFlow;
  ETH_SORA: EthSoraFlow;
}

const setTransactionState = (state: STATES) => {
  return assign({
    history: (context: any) => {
      return ({
        ...context.history,
        transactionState: state
      })
    }
  })
}

const SORA_ETHEREUM_STATES = {
  [STATES.INITIAL]: {
    entry: ACTIONS.SET_BRIDGE_STATUS_PENDING,
    on: {
      SEND_SORA: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.SORA_PENDING),
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_SORA_TRANSACTION,
      onDone: {
        target: STATES.SORA_PENDING,
        actions: ACTIONS.SIGN_TRANSACTION
      },
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_PENDING]: {
    entry: setTransactionState(STATES.SORA_PENDING),
    invoke: {
      src: SERVICES.CHECK_SORA_TRANSACTION,
      onDone: {
        target: STATES.SORA_COMMITED,
        actions: ACTIONS.SET_SORA_TRANSACTION_HASH
      },
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_REJECTED]: {
    entry: [
      setTransactionState(STATES.SORA_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_COMMITED]: {
    entry: setTransactionState(STATES.SORA_COMMITED),
    on: {
      SEND_ETHEREUM: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.ETHEREUM_PENDING),
      ACTIONS.SET_SECOND_TRANSACTION_STEP,
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_ETHEREUM_TRANSACTION,
      onDone: {
        target: STATES.ETHEREUM_PENDING,
        actions: [
          ACTIONS.SIGN_TRANSACTION,
          ACTIONS.SET_ETHEREUM_TRANSACTION_HASH
        ]
      },
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_PENDING]: {
    entry: setTransactionState(STATES.ETHEREUM_PENDING),
    invoke: {
      src: SERVICES.CHECK_ETHEREUM_TRANSACTION,
      onDone: STATES.ETHEREUM_COMMITED,
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_REJECTED]: {
    entry: [
      setTransactionState(STATES.ETHEREUM_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_COMMITED]: {
    entry: [
      setTransactionState(STATES.ETHEREUM_COMMITED),
      ACTIONS.SET_BRIDGE_STATUS_DONE
    ],
    type: 'final'
  }
}

const ETHEREUM_SORA_STATES = {
  [STATES.INITIAL]: {
    entry: ACTIONS.SET_BRIDGE_STATUS_PENDING,
    on: {
      SEND_ETHEREUM: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.ETHEREUM_PENDING),
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_ETHEREUM_TRANSACTION,
      onDone: {
        target: STATES.ETHEREUM_PENDING,
        actions: ACTIONS.SIGN_TRANSACTION
      },
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_PENDING]: {
    entry: setTransactionState(STATES.ETHEREUM_PENDING),
    invoke: {
      src: SERVICES.CHECK_ETHEREUM_TRANSACTION,
      onDone: {
        target: STATES.ETHEREUM_COMMITED,
        actions: ACTIONS.SET_ETHEREUM_TRANSACTION_HASH
      },
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_REJECTED]: {
    entry: [
      setTransactionState(STATES.ETHEREUM_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_COMMITED]: {
    entry: setTransactionState(STATES.ETHEREUM_COMMITED),
    on: {
      SEND_SORA: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.SORA_PENDING),
      ACTIONS.SET_SECOND_TRANSACTION_STEP,
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_SORA_TRANSACTION,
      onDone: {
        target: STATES.SORA_PENDING,
        actions: [
          ACTIONS.SIGN_TRANSACTION,
          ACTIONS.SET_SORA_TRANSACTION_HASH
        ]
      },
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_PENDING]: {
    entry: setTransactionState(STATES.SORA_PENDING),
    invoke: {
      src: SERVICES.CHECK_SORA_TRANSACTION,
      onDone: STATES.SORA_COMMITED,
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_REJECTED]: {
    entry: [
      setTransactionState(STATES.SORA_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_COMMITED]: {
    entry: [
      setTransactionState(STATES.SORA_COMMITED),
      ACTIONS.SET_BRIDGE_STATUS_DONE
    ],
    type: 'final'
  }
}

const SORA_ETHEREUM_SERVICES = {
  [SERVICES.SIGN_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_ETH.sora.sign) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.SORA_ETH.sora.sign({
      txId: context.history.id
    })
  },
  [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_ETH.sora.send) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    return context.SORA_ETH.sora.send({
      txId: context.history.id
    })
  },
  [SERVICES.SIGN_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_ETH.ethereum.sign) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.SORA_ETH.ethereum.sign({
      hash: context.history.hash
    })
  },
  [SERVICES.CHECK_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_ETH.ethereum.send) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    return context.SORA_ETH.ethereum.send({
      ethereumHash: context.history.ethereumHash
    })
  }
}

const ETHEREUM_SORA_SERVICES = {
  [SERVICES.SIGN_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.ETH_SORA.sora.sign) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.ETH_SORA.sora.sign({
      ethereumHash: context.history.ethereumHash
    })
  },
  [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.ETH_SORA.sora.send) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    return context.ETH_SORA.sora.send({
      ethereumHash: context.history.ethereumHash
    })
  },
  [SERVICES.SIGN_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.ETH_SORA.ethereum.sign) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.ETH_SORA.ethereum.sign()
  },
  [SERVICES.CHECK_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.ETH_SORA.ethereum.send) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    return context.ETH_SORA.ethereum.send({
      ethereumHash: context.history.ethereumHash
    })
  }
}

function createFSM (context: Context, states, initialState = STATES.INITIAL) {
  type Transitions =
    | { type: EVENTS.SEND_SORA }
    | { type: EVENTS.SEND_ETHEREUM }
    | { type: EVENTS.RETRY }

  const initialContext: Context = {
    history: context.history,
    SORA_ETH: context.SORA_ETH,
    ETH_SORA: context.ETH_SORA
  }

  const services = states === SORA_ETHEREUM_STATES
    ? SORA_ETHEREUM_SERVICES
    : ETHEREUM_SORA_SERVICES

  const machineOptions: Partial<MachineOptions<Context, any>> = {
    actions: {
      [ACTIONS.SET_SECOND_TRANSACTION_STEP]: assign({
        history: (context) => {
          return ({
            ...context.history,
            transactionStep: 2,
            signed: false
          })
        }
      }),
      [ACTIONS.SIGN_TRANSACTION]: assign({
        history: (context) => {
          return ({
            ...context.history,
            signed: true
          })
        }
      }),
      [ACTIONS.SET_SORA_TRANSACTION_HASH]: assign({
        history: (context, event) => {
          return ({
            ...context.history,
            hash: event.data
          })
        }
      }),
      [ACTIONS.SET_ETHEREUM_TRANSACTION_HASH]: assign({
        history: (context, event) => {
          return ({
            ...context.history,
            ethereumHash: event.data
          })
        }
      }),
      [ACTIONS.SET_BRIDGE_STATUS_PENDING]: assign({
        history: (context) => {
          return ({
            ...context.history,
            status: BridgeTxStatus.Pending
          })
        }
      }),
      [ACTIONS.SET_BRIDGE_STATUS_FAILURE]: assign({
        history: (context) => {
          return ({
            ...context.history,
            status: BridgeTxStatus.Failed,
            endTime: Date.now()
          })
        }
      }),
      [ACTIONS.SET_BRIDGE_STATUS_DONE]: assign({
        history: (context) => {
          return ({
            ...context.history,
            status: BridgeTxStatus.Done,
            endTime: Date.now()
          })
        }
      })
    },
    services
  }

  return Machine<Context, any, Transitions>(
    {
      initial: initialState,
      context: initialContext,
      states
    },
    machineOptions
  )
}

// INITIAL -- nothing
// *_SUBMITTED - signed transaction
// *_PENDING - sended transaction
// *_REJECTED - rejected transaction, possible to call retry
// *_COMMITED = complete transaction

export {
  createFSM,
  EVENTS,
  STATES,
  SORA_ETHEREUM_STATES,
  ETHEREUM_SORA_STATES
}
