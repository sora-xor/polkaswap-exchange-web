import { Machine, MachineOptions, assign } from 'xstate'
import { BridgeTxStatus } from '@sora-substrate/util'

enum EVENTS {
  SEND_SORA = 'SEND_SORA',
  SEND_EVM = 'SEND_EVM',
  RETRY = 'RETRY'
}

enum STATES {
  INITIAL = 'INITIAL',
  SORA_SUBMITTED = 'SORA_SUBMITTED',
  SORA_PENDING = 'SORA_PENDING',
  SORA_REJECTED = 'SORA_REJECTED',
  SORA_COMMITED = 'SORA_COMMITED',
  EVM_SUBMITTED = 'EVM_SUBMITTED',
  EVM_PENDING = 'EVM_PENDING',
  EVM_REJECTED = 'EVM_REJECTED',
  EVM_COMMITED = 'EVM_COMMITED'
}

enum ACTIONS {
  SIGN_TRANSACTION = 'SIGN_TRANSACTION',
  SET_TRANSACTION_STATE = 'SET_TRANSACTION_STATE',
  SET_SECOND_TRANSACTION_STEP = 'SET_SECOND_TRANSACTION_STEP',
  SET_SORA_TRANSACTION_HASH = 'SET_SORA_TRANSACTION_HASH',
  SET_EVM_TRANSACTION_HASH = 'SET_EVM_TRANSACTION_HASH',
  SET_BRIDGE_STATUS_PENDING = 'SET_BRIDGE_STATUS_PENDING',
  SET_BRIDGE_STATUS_FAILURE = 'SET_BRIDGE_STATUS_FAILURE',
  SET_BRIDGE_STATUS_DONE = 'SET_BRIDGE_STATUS_DONE'
}

enum SERVICES {
  SIGN_SORA_TRANSACTION = 'SIGN_SORA_TRANSACTION',
  CHECK_SORA_TRANSACTION = 'CHECK_SORA_TRANSACTION',
  SIGN_EVM_TRANSACTION = 'SIGN_EVM_TRANSACTION',
  CHECK_EVM_TRANSACTION = 'CHECK_EVM_TRANSACTION'
}

interface SoraEthFlow {
  sora: {
    sign: ({ txId: string }) => Promise<any>;
    send: ({ txId: string }) => Promise<any>;
  };
  evm: {
    sign: ({ hash: string }) => Promise<any>;
    send: ({ ethereumHash: string }) => Promise<any>;
  };
}
interface EthSoraFlow {
  evm: {
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
  SORA_EVM: SoraEthFlow;
  EVM_SORA: EthSoraFlow;
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

const SORA_EVM_STATES = {
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
      SEND_EVM: STATES.EVM_SUBMITTED
    }
  },
  [STATES.EVM_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.EVM_PENDING),
      ACTIONS.SET_SECOND_TRANSACTION_STEP,
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_EVM_TRANSACTION,
      onDone: {
        target: STATES.EVM_PENDING,
        actions: [
          ACTIONS.SIGN_TRANSACTION,
          ACTIONS.SET_EVM_TRANSACTION_HASH
        ]
      },
      onError: STATES.EVM_REJECTED
    }
  },
  [STATES.EVM_PENDING]: {
    entry: setTransactionState(STATES.EVM_PENDING),
    invoke: {
      src: SERVICES.CHECK_EVM_TRANSACTION,
      onDone: STATES.EVM_COMMITED,
      onError: STATES.EVM_REJECTED
    }
  },
  [STATES.EVM_REJECTED]: {
    entry: [
      setTransactionState(STATES.EVM_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.EVM_SUBMITTED
    }
  },
  [STATES.EVM_COMMITED]: {
    entry: [
      setTransactionState(STATES.EVM_COMMITED),
      ACTIONS.SET_BRIDGE_STATUS_DONE
    ],
    type: 'final'
  }
}

const EVM_SORA_STATES = {
  [STATES.INITIAL]: {
    entry: ACTIONS.SET_BRIDGE_STATUS_PENDING,
    on: {
      SEND_EVM: STATES.EVM_SUBMITTED
    }
  },
  [STATES.EVM_SUBMITTED]: {
    entry: [
      setTransactionState(STATES.EVM_PENDING),
      ACTIONS.SET_BRIDGE_STATUS_PENDING
    ],
    invoke: {
      src: SERVICES.SIGN_EVM_TRANSACTION,
      onDone: {
        target: STATES.EVM_PENDING,
        actions: [
          ACTIONS.SIGN_TRANSACTION,
          ACTIONS.SET_EVM_TRANSACTION_HASH
        ]
      },
      onError: STATES.EVM_REJECTED
    }
  },
  [STATES.EVM_PENDING]: {
    entry: setTransactionState(STATES.EVM_PENDING),
    invoke: {
      src: SERVICES.CHECK_EVM_TRANSACTION,
      onDone: STATES.EVM_COMMITED,
      onError: STATES.EVM_REJECTED
    }
  },
  [STATES.EVM_REJECTED]: {
    entry: [
      setTransactionState(STATES.EVM_REJECTED),
      ACTIONS.SET_BRIDGE_STATUS_FAILURE
    ],
    on: {
      RETRY: STATES.EVM_SUBMITTED
    }
  },
  [STATES.EVM_COMMITED]: {
    entry: setTransactionState(STATES.EVM_COMMITED),
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

const SORA_EVM_SERVICES = {
  [SERVICES.SIGN_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_EVM.sora.sign) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.SORA_EVM.sora.sign({
      txId: context.history.id
    })
  },
  [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_EVM.sora.send) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    return context.SORA_EVM.sora.send({
      txId: context.history.id
    })
  },
  [SERVICES.SIGN_EVM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_EVM.evm.sign) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.SORA_EVM.evm.sign({
      hash: context.history.hash
    })
  },
  [SERVICES.CHECK_EVM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.SORA_EVM.evm.send) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    return context.SORA_EVM.evm.send({
      ethereumHash: context.history.ethereumHash
    })
  }
}

const EVM_SORA_SERVICES = {
  [SERVICES.SIGN_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.EVM_SORA.sora.sign) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.EVM_SORA.sora.sign({
      ethereumHash: context.history.ethereumHash
    })
  },
  [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.EVM_SORA.sora.send) {
      throw new Error('Unexpected behaviour! Please check SORA transaction')
    }

    return context.EVM_SORA.sora.send({
      ethereumHash: context.history.ethereumHash
    })
  },
  [SERVICES.SIGN_EVM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.EVM_SORA.evm.sign) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    if (context.history.signed) return Promise.resolve()

    return context.EVM_SORA.evm.sign()
  },
  [SERVICES.CHECK_EVM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
    if (!context.EVM_SORA.evm.send) {
      throw new Error('Unexpected behaviour! Please check ETH transaction')
    }

    return context.EVM_SORA.evm.send({
      ethereumHash: context.history.ethereumHash
    })
  }
}

function createFSM (context: Context, states, initialState = STATES.INITIAL) {
  type Transitions =
    | { type: EVENTS.SEND_SORA }
    | { type: EVENTS.SEND_EVM }
    | { type: EVENTS.RETRY }

  const initialContext: Context = {
    history: context.history,
    SORA_EVM: context.SORA_EVM,
    EVM_SORA: context.EVM_SORA
  }

  const services = states === SORA_EVM_STATES
    ? SORA_EVM_SERVICES
    : EVM_SORA_SERVICES

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
          if (!event.data) return context.history

          return ({
            ...context.history,
            hash: event.data.hash,
            to: event.data.to
          })
        }
      }),
      [ACTIONS.SET_EVM_TRANSACTION_HASH]: assign({
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

export {
  createFSM,
  EVENTS,
  STATES,
  SORA_EVM_STATES,
  EVM_SORA_STATES
}
