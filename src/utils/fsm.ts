import { Machine, MachineOptions } from 'xstate'

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

enum SERVICES {
  CHECK_SORA_TRANSACTION = 'CHECK_SORA_TRANSACTION',
  CHECK_ETHEREUM_TRANSACTION = 'CHECK_ETHEREUM_TRANSACTION'
}

const SORA_ETHEREUM_STATES = {
  [STATES.INITIAL]: {
    on: {
      SEND_SORA: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_SUBMITTED]: {
    always: {
      target: STATES.SORA_PENDING
    }
  },
  [STATES.SORA_PENDING]: {
    invoke: {
      src: SERVICES.CHECK_SORA_TRANSACTION,
      onDone: STATES.SORA_COMMITED,
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_REJECTED]: {
    on: {
      RETRY: STATES.SORA_PENDING
    }
  },
  [STATES.SORA_COMMITED]: {
    on: {
      SEND_ETHEREUM: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_SUBMITTED]: {
    always: {
      target: STATES.ETHEREUM_PENDING
    }
  },
  [STATES.ETHEREUM_PENDING]: {
    invoke: {
      src: SERVICES.CHECK_ETHEREUM_TRANSACTION,
      onDone: STATES.ETHEREUM_COMMITED,
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_REJECTED]: {
    on: {
      RETRY: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_COMMITED]: {
    type: 'final'
  }
}

const ETHEREUM_SORA_STATES = {
  [STATES.INITIAL]: {
    on: {
      SEND_ETHEREUM: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_SUBMITTED]: {
    always: {
      target: STATES.ETHEREUM_PENDING
    }
  },
  [STATES.ETHEREUM_PENDING]: {
    invoke: {
      src: SERVICES.CHECK_ETHEREUM_TRANSACTION,
      onDone: STATES.ETHEREUM_COMMITED,
      onError: STATES.ETHEREUM_REJECTED
    }
  },
  [STATES.ETHEREUM_REJECTED]: {
    on: {
      RETRY: STATES.ETHEREUM_PENDING
    }
  },
  [STATES.ETHEREUM_COMMITED]: {
    on: {
      SEND_SORA: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_SUBMITTED]: {
    always: {
      target: STATES.SORA_PENDING
    }
  },
  [STATES.SORA_PENDING]: {
    invoke: {
      src: SERVICES.CHECK_SORA_TRANSACTION,
      onDone: STATES.SORA_COMMITED,
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_REJECTED]: {
    on: {
      RETRY: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_COMMITED]: {
    type: 'final'
  }
}

function createFSM (actions: {
  sendFirstTransaction: () => Promise<any>;
  sendSecondTransaction: () => Promise<any>;
}, states, initialState = STATES.INITIAL) {
  type Transitions =
    | { type: EVENTS.SEND_SORA }
    | { type: EVENTS.SEND_ETHEREUM }
    | { type: EVENTS.RETRY }
  interface Context {
    sendSoraTransactionPromise?: () => Promise<any>;
    sendEthereumTransactionPromise?: () => Promise<any>;
  }

  const transactionActions = states === SORA_ETHEREUM_STATES
    ? [actions.sendFirstTransaction, actions.sendSecondTransaction]
    : [actions.sendSecondTransaction, actions.sendFirstTransaction]

  const initialContext: Context = {
    sendSoraTransactionPromise: transactionActions[0],
    sendEthereumTransactionPromise: transactionActions[1]
  }

  const machineOptions: Partial<MachineOptions<Context, any>> = {
    services: {
      [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.sendSoraTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check SORA transaction')
        }
        return context.sendSoraTransactionPromise()
      },
      [SERVICES.CHECK_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.sendEthereumTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check ETH transaction')
        }
        return context.sendEthereumTransactionPromise()
      }
    }
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
  SORA_ETHEREUM_STATES,
  ETHEREUM_SORA_STATES
}
