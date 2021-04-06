import { Machine, MachineOptions, assign } from 'xstate'

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
  SET_SORA_TRANSACTIONS_HASH = 'SET_SORA_TRANSACTIONS_HASH',
  SET_ETHEREUM_TRANSACTION_HASH = 'SET_ETHEREUM_TRANSACTION_HASH'
}

enum SERVICES {
  SIGN_SORA_TRANSACTION = 'SIGN_SORA_TRANSACTION',
  CHECK_SORA_TRANSACTION = 'CHECK_SORA_TRANSACTION',
  SIGN_ETHEREUM_TRANSACTION = 'SIGN_ETHEREUM_TRANSACTION',
  CHECK_ETHEREUM_TRANSACTION = 'CHECK_ETHEREUM_TRANSACTION'
}

const setTransactionState = (state: STATES) => {
  return assign({
    history: (context: any) => {
      console.log('update transaction state', state)
      return ({
        ...context.history,
        transactionState: state
      })
    }
  })
}

const SORA_ETHEREUM_STATES = {
  [STATES.INITIAL]: {
    on: {
      SEND_SORA: STATES.SORA_SUBMITTED
    }
  },
  [STATES.SORA_SUBMITTED]: {
    entry: setTransactionState(STATES.SORA_SUBMITTED),
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
        actions: ACTIONS.SET_SORA_TRANSACTIONS_HASH
      },
      onError: STATES.SORA_REJECTED
    }
  },
  [STATES.SORA_REJECTED]: {
    entry: setTransactionState(STATES.SORA_REJECTED),
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
      setTransactionState(STATES.ETHEREUM_SUBMITTED),
      ACTIONS.SET_SECOND_TRANSACTION_STEP
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
    entry: setTransactionState(STATES.ETHEREUM_REJECTED),
    on: {
      RETRY: STATES.ETHEREUM_SUBMITTED
    }
  },
  [STATES.ETHEREUM_COMMITED]: {
    entry: setTransactionState(STATES.ETHEREUM_COMMITED)
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
interface TransactionPart {
  sign: () => Promise<any>;
  send: () => Promise<any>;
}
interface TransactionFlow {
  first: TransactionPart;
  second: TransactionPart;
}
interface Actions {
  history: any;
  flow: TransactionFlow;
}

function createFSM (actions: Actions, states, initialState = STATES.INITIAL) {
  type Transitions =
    | { type: EVENTS.SEND_SORA }
    | { type: EVENTS.SEND_ETHEREUM }
    | { type: EVENTS.RETRY }
  interface Context {
    history: any;
    sendSoraTransactionPromise?: ({ txId: string }) => Promise<any>;
    signSoraTransactionPromise?: ({ txId: string }) => Promise<any>;
    sendEthereumTransactionPromise?: ({ ethereumHash: string }) => Promise<any>;
    signEthereumTransactionPromise?: ({ hash: string }) => Promise<any>;
  }

  const transactionActions = states === SORA_ETHEREUM_STATES
    ? [actions.flow.first, actions.flow.second]
    : [actions.flow.second, actions.flow.first]

  console.log(actions.history)

  const initialContext: Context = {
    history: actions.history,
    sendSoraTransactionPromise: transactionActions[0].send,
    signSoraTransactionPromise: transactionActions[0].sign,
    sendEthereumTransactionPromise: transactionActions[1].send,
    signEthereumTransactionPromise: transactionActions[1].sign
  }

  const machineOptions: Partial<MachineOptions<Context, any>> = {
    actions: {
      [ACTIONS.SET_SECOND_TRANSACTION_STEP]: assign({
        history: (context, event) => {
          console.log('second step', 2)
          return ({
            ...context.history,
            transactionStep: 2,
            signed: false
          })
        }
      }),
      [ACTIONS.SIGN_TRANSACTION]: assign({
        history: (context, event) => {
          console.log('sign sora', event)
          return ({
            ...context.history,
            signed: true
          })
        }
      }),
      [ACTIONS.SET_SORA_TRANSACTIONS_HASH]: assign({
        history: (context, event) => {
          console.log('sora hash', event)
          return ({
            ...context.history,
            hash: event.data
          })
        }
      }),
      [ACTIONS.SET_ETHEREUM_TRANSACTION_HASH]: assign({
        history: (context, event) => {
          console.log('ethereum hash', event)
          return ({
            ...context.history,
            ethereumHash: event.data
          })
        }
      })
    },
    services: {
      [SERVICES.SIGN_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.signSoraTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check SORA transaction')
        }

        console.log('SIGN', context.history.id)

        if (context.history.signed) return Promise.resolve()

        return context.signSoraTransactionPromise({
          txId: context.history.id
        })
      },
      [SERVICES.CHECK_SORA_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.sendSoraTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check SORA transaction')
        }

        console.log('send', context.history.id)

        return context.sendSoraTransactionPromise({
          txId: context.history.id
        })
      },
      [SERVICES.SIGN_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.signEthereumTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check ETH transaction')
        }

        return context.signEthereumTransactionPromise({
          hash: context.history.hash
        })
      },
      [SERVICES.CHECK_ETHEREUM_TRANSACTION]: (context: Context, event: any): PromiseLike<any> => {
        if (!context.sendEthereumTransactionPromise) {
          throw new Error('Unexpected behaviour! Please check ETH transaction')
        }

        console.log(context.history.ethereumHash)

        return context.sendEthereumTransactionPromise({
          ethereumHash: context.history.ethereumHash
        })
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
