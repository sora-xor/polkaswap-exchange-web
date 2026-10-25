declare const _default: {
  /**
   * Lookup3: frame_system::AccountInfo<Index, pallet_balances::AccountData<Balance>>
   **/
  FrameSystemAccountInfo: {
    nonce: string;
    consumers: string;
    providers: string;
    sufficients: string;
    data: string;
  };
  /**
   * Lookup5: pallet_balances::AccountData<Balance>
   **/
  PalletBalancesAccountData: {
    free: string;
    reserved: string;
    miscFrozen: string;
    feeFrozen: string;
  };
  /**
   * Lookup7: frame_support::dispatch::PerDispatchClass<sp_weights::weight_v2::Weight>
   **/
  FrameSupportDispatchPerDispatchClassWeight: {
    normal: string;
    operational: string;
    mandatory: string;
  };
  /**
   * Lookup8: sp_weights::weight_v2::Weight
   **/
  SpWeightsWeightV2Weight: {
    refTime: string;
    proofSize: string;
  };
  /**
   * Lookup13: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: string;
  };
  /**
   * Lookup15: sp_runtime::generic::digest::DigestItem
   **/
  SpRuntimeDigestDigestItem: {
    _enum: {
      Other: string;
      __Unused1: string;
      __Unused2: string;
      __Unused3: string;
      Consensus: string;
      Seal: string;
      PreRuntime: string;
      __Unused7: string;
      RuntimeEnvironmentUpdated: string;
    };
  };
  /**
   * Lookup18: frame_system::EventRecord<kitchensink_runtime::RuntimeEvent, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: string;
    event: string;
    topics: string;
  };
  /**
   * Lookup20: frame_system::pallet::Event<T>
   **/
  FrameSystemEvent: {
    _enum: {
      ExtrinsicSuccess: {
        dispatchInfo: string;
      };
      ExtrinsicFailed: {
        dispatchError: string;
        dispatchInfo: string;
      };
      CodeUpdated: string;
      NewAccount: {
        account: string;
      };
      KilledAccount: {
        account: string;
      };
      Remarked: {
        _alias: {
          hash_: string;
        };
        sender: string;
        hash_: string;
      };
    };
  };
  /**
   * Lookup21: frame_support::dispatch::DispatchInfo
   **/
  FrameSupportDispatchDispatchInfo: {
    weight: string;
    class: string;
    paysFee: string;
  };
  /**
   * Lookup22: frame_support::dispatch::DispatchClass
   **/
  FrameSupportDispatchDispatchClass: {
    _enum: string[];
  };
  /**
   * Lookup23: frame_support::dispatch::Pays
   **/
  FrameSupportDispatchPays: {
    _enum: string[];
  };
  /**
   * Lookup24: sp_runtime::DispatchError
   **/
  SpRuntimeDispatchError: {
    _enum: {
      Other: string;
      CannotLookup: string;
      BadOrigin: string;
      Module: string;
      ConsumerRemaining: string;
      NoProviders: string;
      TooManyConsumers: string;
      Token: string;
      Arithmetic: string;
      Transactional: string;
      Exhausted: string;
      Corruption: string;
      Unavailable: string;
    };
  };
  /**
   * Lookup25: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: string;
    error: string;
  };
  /**
   * Lookup26: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: string[];
  };
  /**
   * Lookup27: sp_arithmetic::ArithmeticError
   **/
  SpArithmeticArithmeticError: {
    _enum: string[];
  };
  /**
   * Lookup28: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: string[];
  };
  /**
   * Lookup29: pallet_utility::pallet::Event
   **/
  PalletUtilityEvent: {
    _enum: {
      BatchInterrupted: {
        index: string;
        error: string;
      };
      BatchCompleted: string;
      BatchCompletedWithErrors: string;
      ItemCompleted: string;
      ItemFailed: {
        error: string;
      };
      DispatchedAs: {
        result: string;
      };
    };
  };
  /**
   * Lookup32: pallet_indices::pallet::Event<T>
   **/
  PalletIndicesEvent: {
    _enum: {
      IndexAssigned: {
        who: string;
        index: string;
      };
      IndexFreed: {
        index: string;
      };
      IndexFrozen: {
        index: string;
        who: string;
      };
    };
  };
  /**
   * Lookup33: pallet_balances::pallet::Event<T, I>
   **/
  PalletBalancesEvent: {
    _enum: {
      Endowed: {
        account: string;
        freeBalance: string;
      };
      DustLost: {
        account: string;
        amount: string;
      };
      Transfer: {
        from: string;
        to: string;
        amount: string;
      };
      BalanceSet: {
        who: string;
        free: string;
        reserved: string;
      };
      Reserved: {
        who: string;
        amount: string;
      };
      Unreserved: {
        who: string;
        amount: string;
      };
      ReserveRepatriated: {
        from: string;
        to: string;
        amount: string;
        destinationStatus: string;
      };
      Deposit: {
        who: string;
        amount: string;
      };
      Withdraw: {
        who: string;
        amount: string;
      };
      Slashed: {
        who: string;
        amount: string;
      };
    };
  };
  /**
   * Lookup34: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: string[];
  };
  /**
   * Lookup35: pallet_transaction_payment::pallet::Event<T>
   **/
  PalletTransactionPaymentEvent: {
    _enum: {
      TransactionFeePaid: {
        who: string;
        actualFee: string;
        tip: string;
      };
    };
  };
  /**
   * Lookup36: pallet_asset_tx_payment::pallet::Event<T>
   **/
  PalletAssetTxPaymentEvent: {
    _enum: {
      AssetTxFeePaid: {
        who: string;
        actualFee: string;
        tip: string;
        assetId: string;
      };
    };
  };
  /**
   * Lookup38: pallet_election_provider_multi_phase::pallet::Event<T>
   **/
  PalletElectionProviderMultiPhaseEvent: {
    _enum: {
      SolutionStored: {
        compute: string;
        origin: string;
        prevEjected: string;
      };
      ElectionFinalized: {
        compute: string;
        score: string;
      };
      ElectionFailed: string;
      Rewarded: {
        account: string;
        value: string;
      };
      Slashed: {
        account: string;
        value: string;
      };
      PhaseTransitioned: {
        from: string;
        to: string;
        round: string;
      };
    };
  };
  /**
   * Lookup39: pallet_election_provider_multi_phase::ElectionCompute
   **/
  PalletElectionProviderMultiPhaseElectionCompute: {
    _enum: string[];
  };
  /**
   * Lookup42: sp_npos_elections::ElectionScore
   **/
  SpNposElectionsElectionScore: {
    minimalStake: string;
    sumStake: string;
    sumStakeSquared: string;
  };
  /**
   * Lookup43: pallet_election_provider_multi_phase::Phase<Bn>
   **/
  PalletElectionProviderMultiPhasePhase: {
    _enum: {
      Off: string;
      Signed: string;
      Unsigned: string;
      Emergency: string;
    };
  };
  /**
   * Lookup45: pallet_staking::pallet::pallet::Event<T>
   **/
  PalletStakingPalletEvent: {
    _enum: {
      EraPaid: {
        eraIndex: string;
        validatorPayout: string;
        remainder: string;
      };
      Rewarded: {
        stash: string;
        amount: string;
      };
      Slashed: {
        staker: string;
        amount: string;
      };
      SlashReported: {
        validator: string;
        fraction: string;
        slashEra: string;
      };
      OldSlashingReportDiscarded: {
        sessionIndex: string;
      };
      StakersElected: string;
      Bonded: {
        stash: string;
        amount: string;
      };
      Unbonded: {
        stash: string;
        amount: string;
      };
      Withdrawn: {
        stash: string;
        amount: string;
      };
      Kicked: {
        nominator: string;
        stash: string;
      };
      StakingElectionFailed: string;
      Chilled: {
        stash: string;
      };
      PayoutStarted: {
        eraIndex: string;
        validatorStash: string;
      };
      ValidatorPrefsSet: {
        stash: string;
        prefs: string;
      };
      ForceEra: {
        mode: string;
      };
    };
  };
  /**
   * Lookup47: pallet_staking::ValidatorPrefs
   **/
  PalletStakingValidatorPrefs: {
    commission: string;
    blocked: string;
  };
  /**
   * Lookup49: pallet_staking::Forcing
   **/
  PalletStakingForcing: {
    _enum: string[];
  };
  /**
   * Lookup50: pallet_session::pallet::Event
   **/
  PalletSessionEvent: {
    _enum: {
      NewSession: {
        sessionIndex: string;
      };
    };
  };
  /**
   * Lookup51: pallet_democracy::pallet::Event<T>
   **/
  PalletDemocracyEvent: {
    _enum: {
      Proposed: {
        proposalIndex: string;
        deposit: string;
      };
      Tabled: {
        proposalIndex: string;
        deposit: string;
      };
      ExternalTabled: string;
      Started: {
        refIndex: string;
        threshold: string;
      };
      Passed: {
        refIndex: string;
      };
      NotPassed: {
        refIndex: string;
      };
      Cancelled: {
        refIndex: string;
      };
      Delegated: {
        who: string;
        target: string;
      };
      Undelegated: {
        account: string;
      };
      Vetoed: {
        who: string;
        proposalHash: string;
        until: string;
      };
      Blacklisted: {
        proposalHash: string;
      };
      Voted: {
        voter: string;
        refIndex: string;
        vote: string;
      };
      Seconded: {
        seconder: string;
        propIndex: string;
      };
      ProposalCanceled: {
        propIndex: string;
      };
      MetadataSet: {
        _alias: {
          hash_: string;
        };
        owner: string;
        hash_: string;
      };
      MetadataCleared: {
        _alias: {
          hash_: string;
        };
        owner: string;
        hash_: string;
      };
      MetadataTransferred: {
        _alias: {
          hash_: string;
        };
        prevOwner: string;
        owner: string;
        hash_: string;
      };
    };
  };
  /**
   * Lookup52: pallet_democracy::vote_threshold::VoteThreshold
   **/
  PalletDemocracyVoteThreshold: {
    _enum: string[];
  };
  /**
   * Lookup53: pallet_democracy::vote::AccountVote<Balance>
   **/
  PalletDemocracyVoteAccountVote: {
    _enum: {
      Standard: {
        vote: string;
        balance: string;
      };
      Split: {
        aye: string;
        nay: string;
      };
    };
  };
  /**
   * Lookup55: pallet_democracy::types::MetadataOwner
   **/
  PalletDemocracyMetadataOwner: {
    _enum: {
      External: string;
      Proposal: string;
      Referendum: string;
    };
  };
  /**
   * Lookup56: pallet_collective::pallet::Event<T, I>
   **/
  PalletCollectiveEvent: {
    _enum: {
      Proposed: {
        account: string;
        proposalIndex: string;
        proposalHash: string;
        threshold: string;
      };
      Voted: {
        account: string;
        proposalHash: string;
        voted: string;
        yes: string;
        no: string;
      };
      Approved: {
        proposalHash: string;
      };
      Disapproved: {
        proposalHash: string;
      };
      Executed: {
        proposalHash: string;
        result: string;
      };
      MemberExecuted: {
        proposalHash: string;
        result: string;
      };
      Closed: {
        proposalHash: string;
        yes: string;
        no: string;
      };
    };
  };
  /**
   * Lookup58: pallet_elections_phragmen::pallet::Event<T>
   **/
  PalletElectionsPhragmenEvent: {
    _enum: {
      NewTerm: {
        newMembers: string;
      };
      EmptyTerm: string;
      ElectionError: string;
      MemberKicked: {
        member: string;
      };
      Renounced: {
        candidate: string;
      };
      CandidateSlashed: {
        candidate: string;
        amount: string;
      };
      SeatHolderSlashed: {
        seatHolder: string;
        amount: string;
      };
    };
  };
  /**
   * Lookup61: pallet_membership::pallet::Event<T, I>
   **/
  PalletMembershipEvent: {
    _enum: string[];
  };
  /**
   * Lookup62: pallet_grandpa::pallet::Event
   **/
  PalletGrandpaEvent: {
    _enum: {
      NewAuthorities: {
        authoritySet: string;
      };
      Paused: string;
      Resumed: string;
    };
  };
  /**
   * Lookup65: sp_finality_grandpa::app::Public
   **/
  SpFinalityGrandpaAppPublic: string;
  /**
   * Lookup66: sp_core::ed25519::Public
   **/
  SpCoreEd25519Public: string;
  /**
   * Lookup67: pallet_treasury::pallet::Event<T, I>
   **/
  PalletTreasuryEvent: {
    _enum: {
      Proposed: {
        proposalIndex: string;
      };
      Spending: {
        budgetRemaining: string;
      };
      Awarded: {
        proposalIndex: string;
        award: string;
        account: string;
      };
      Rejected: {
        proposalIndex: string;
        slashed: string;
      };
      Burnt: {
        burntFunds: string;
      };
      Rollover: {
        rolloverBalance: string;
      };
      Deposit: {
        value: string;
      };
      SpendApproved: {
        proposalIndex: string;
        amount: string;
        beneficiary: string;
      };
      UpdatedInactive: {
        reactivated: string;
        deactivated: string;
      };
    };
  };
  /**
   * Lookup68: pallet_contracts::pallet::Event<T>
   **/
  PalletContractsEvent: {
    _enum: {
      Instantiated: {
        deployer: string;
        contract: string;
      };
      Terminated: {
        contract: string;
        beneficiary: string;
      };
      CodeStored: {
        codeHash: string;
      };
      ContractEmitted: {
        contract: string;
        data: string;
      };
      CodeRemoved: {
        codeHash: string;
      };
      ContractCodeUpdated: {
        contract: string;
        newCodeHash: string;
        oldCodeHash: string;
      };
      Called: {
        caller: string;
        contract: string;
      };
      DelegateCalled: {
        contract: string;
        codeHash: string;
      };
    };
  };
  /**
   * Lookup69: pallet_sudo::pallet::Event<T>
   **/
  PalletSudoEvent: {
    _enum: {
      Sudid: {
        sudoResult: string;
      };
      KeyChanged: {
        oldSudoer: string;
      };
      SudoAsDone: {
        sudoResult: string;
      };
    };
  };
  /**
   * Lookup70: pallet_im_online::pallet::Event<T>
   **/
  PalletImOnlineEvent: {
    _enum: {
      HeartbeatReceived: {
        authorityId: string;
      };
      AllGood: string;
      SomeOffline: {
        offline: string;
      };
    };
  };
  /**
   * Lookup71: pallet_im_online::sr25519::app_sr25519::Public
   **/
  PalletImOnlineSr25519AppSr25519Public: string;
  /**
   * Lookup72: sp_core::sr25519::Public
   **/
  SpCoreSr25519Public: string;
  /**
   * Lookup75: pallet_staking::Exposure<sp_core::crypto::AccountId32, Balance>
   **/
  PalletStakingExposure: {
    total: string;
    own: string;
    others: string;
  };
  /**
   * Lookup78: pallet_staking::IndividualExposure<sp_core::crypto::AccountId32, Balance>
   **/
  PalletStakingIndividualExposure: {
    who: string;
    value: string;
  };
  /**
   * Lookup79: pallet_offences::pallet::Event
   **/
  PalletOffencesEvent: {
    _enum: {
      Offence: {
        kind: string;
        timeslot: string;
      };
    };
  };
  /**
   * Lookup81: pallet_identity::pallet::Event<T>
   **/
  PalletIdentityEvent: {
    _enum: {
      IdentitySet: {
        who: string;
      };
      IdentityCleared: {
        who: string;
        deposit: string;
      };
      IdentityKilled: {
        who: string;
        deposit: string;
      };
      JudgementRequested: {
        who: string;
        registrarIndex: string;
      };
      JudgementUnrequested: {
        who: string;
        registrarIndex: string;
      };
      JudgementGiven: {
        target: string;
        registrarIndex: string;
      };
      RegistrarAdded: {
        registrarIndex: string;
      };
      SubIdentityAdded: {
        sub: string;
        main: string;
        deposit: string;
      };
      SubIdentityRemoved: {
        sub: string;
        main: string;
        deposit: string;
      };
      SubIdentityRevoked: {
        sub: string;
        main: string;
        deposit: string;
      };
    };
  };
  /**
   * Lookup82: pallet_society::pallet::Event<T, I>
   **/
  PalletSocietyEvent: {
    _enum: {
      Founded: {
        founder: string;
      };
      Bid: {
        candidateId: string;
        offer: string;
      };
      Vouch: {
        candidateId: string;
        offer: string;
        vouching: string;
      };
      AutoUnbid: {
        candidate: string;
      };
      Unbid: {
        candidate: string;
      };
      Unvouch: {
        candidate: string;
      };
      Inducted: {
        primary: string;
        candidates: string;
      };
      SuspendedMemberJudgement: {
        who: string;
        judged: string;
      };
      CandidateSuspended: {
        candidate: string;
      };
      MemberSuspended: {
        member: string;
      };
      Challenged: {
        member: string;
      };
      Vote: {
        candidate: string;
        voter: string;
        vote: string;
      };
      DefenderVote: {
        voter: string;
        vote: string;
      };
      NewMaxMembers: {
        max: string;
      };
      Unfounded: {
        founder: string;
      };
      Deposit: {
        value: string;
      };
      SkepticsChosen: {
        skeptics: string;
      };
    };
  };
  /**
   * Lookup84: pallet_recovery::pallet::Event<T>
   **/
  PalletRecoveryEvent: {
    _enum: {
      RecoveryCreated: {
        account: string;
      };
      RecoveryInitiated: {
        lostAccount: string;
        rescuerAccount: string;
      };
      RecoveryVouched: {
        lostAccount: string;
        rescuerAccount: string;
        sender: string;
      };
      RecoveryClosed: {
        lostAccount: string;
        rescuerAccount: string;
      };
      AccountRecovered: {
        lostAccount: string;
        rescuerAccount: string;
      };
      RecoveryRemoved: {
        lostAccount: string;
      };
    };
  };
  /**
   * Lookup85: pallet_vesting::pallet::Event<T>
   **/
  PalletVestingEvent: {
    _enum: {
      VestingUpdated: {
        account: string;
        unvested: string;
      };
      VestingCompleted: {
        account: string;
      };
    };
  };
  /**
   * Lookup86: pallet_scheduler::pallet::Event<T>
   **/
  PalletSchedulerEvent: {
    _enum: {
      Scheduled: {
        when: string;
        index: string;
      };
      Canceled: {
        when: string;
        index: string;
      };
      Dispatched: {
        task: string;
        id: string;
        result: string;
      };
      CallUnavailable: {
        task: string;
        id: string;
      };
      PeriodicFailed: {
        task: string;
        id: string;
      };
      PermanentlyOverweight: {
        task: string;
        id: string;
      };
    };
  };
  /**
   * Lookup89: pallet_preimage::pallet::Event<T>
   **/
  PalletPreimageEvent: {
    _enum: {
      Noted: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      Requested: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      Cleared: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
    };
  };
  /**
   * Lookup90: pallet_proxy::pallet::Event<T>
   **/
  PalletProxyEvent: {
    _enum: {
      ProxyExecuted: {
        result: string;
      };
      PureCreated: {
        pure: string;
        who: string;
        proxyType: string;
        disambiguationIndex: string;
      };
      Announced: {
        real: string;
        proxy: string;
        callHash: string;
      };
      ProxyAdded: {
        delegator: string;
        delegatee: string;
        proxyType: string;
        delay: string;
      };
      ProxyRemoved: {
        delegator: string;
        delegatee: string;
        proxyType: string;
        delay: string;
      };
    };
  };
  /**
   * Lookup91: kitchensink_runtime::ProxyType
   **/
  KitchensinkRuntimeProxyType: {
    _enum: string[];
  };
  /**
   * Lookup93: pallet_multisig::pallet::Event<T>
   **/
  PalletMultisigEvent: {
    _enum: {
      NewMultisig: {
        approving: string;
        multisig: string;
        callHash: string;
      };
      MultisigApproval: {
        approving: string;
        timepoint: string;
        multisig: string;
        callHash: string;
      };
      MultisigExecuted: {
        approving: string;
        timepoint: string;
        multisig: string;
        callHash: string;
        result: string;
      };
      MultisigCancelled: {
        cancelling: string;
        timepoint: string;
        multisig: string;
        callHash: string;
      };
    };
  };
  /**
   * Lookup94: pallet_multisig::Timepoint<BlockNumber>
   **/
  PalletMultisigTimepoint: {
    height: string;
    index: string;
  };
  /**
   * Lookup95: pallet_bounties::pallet::Event<T, I>
   **/
  PalletBountiesEvent: {
    _enum: {
      BountyProposed: {
        index: string;
      };
      BountyRejected: {
        index: string;
        bond: string;
      };
      BountyBecameActive: {
        index: string;
      };
      BountyAwarded: {
        index: string;
        beneficiary: string;
      };
      BountyClaimed: {
        index: string;
        payout: string;
        beneficiary: string;
      };
      BountyCanceled: {
        index: string;
      };
      BountyExtended: {
        index: string;
      };
    };
  };
  /**
   * Lookup96: pallet_tips::pallet::Event<T, I>
   **/
  PalletTipsEvent: {
    _enum: {
      NewTip: {
        tipHash: string;
      };
      TipClosing: {
        tipHash: string;
      };
      TipClosed: {
        tipHash: string;
        who: string;
        payout: string;
      };
      TipRetracted: {
        tipHash: string;
      };
      TipSlashed: {
        tipHash: string;
        finder: string;
        deposit: string;
      };
    };
  };
  /**
   * Lookup97: pallet_assets::pallet::Event<T, I>
   **/
  PalletAssetsEvent: {
    _enum: {
      Created: {
        assetId: string;
        creator: string;
        owner: string;
      };
      Issued: {
        assetId: string;
        owner: string;
        amount: string;
      };
      Transferred: {
        assetId: string;
        from: string;
        to: string;
        amount: string;
      };
      Burned: {
        assetId: string;
        owner: string;
        balance: string;
      };
      TeamChanged: {
        assetId: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      OwnerChanged: {
        assetId: string;
        owner: string;
      };
      Frozen: {
        assetId: string;
        who: string;
      };
      Thawed: {
        assetId: string;
        who: string;
      };
      AssetFrozen: {
        assetId: string;
      };
      AssetThawed: {
        assetId: string;
      };
      AccountsDestroyed: {
        assetId: string;
        accountsDestroyed: string;
        accountsRemaining: string;
      };
      ApprovalsDestroyed: {
        assetId: string;
        approvalsDestroyed: string;
        approvalsRemaining: string;
      };
      DestructionStarted: {
        assetId: string;
      };
      Destroyed: {
        assetId: string;
      };
      ForceCreated: {
        assetId: string;
        owner: string;
      };
      MetadataSet: {
        assetId: string;
        name: string;
        symbol: string;
        decimals: string;
        isFrozen: string;
      };
      MetadataCleared: {
        assetId: string;
      };
      ApprovedTransfer: {
        assetId: string;
        source: string;
        delegate: string;
        amount: string;
      };
      ApprovalCancelled: {
        assetId: string;
        owner: string;
        delegate: string;
      };
      TransferredApproved: {
        assetId: string;
        owner: string;
        delegate: string;
        destination: string;
        amount: string;
      };
      AssetStatusChanged: {
        assetId: string;
      };
    };
  };
  /**
   * Lookup98: pallet_lottery::pallet::Event<T>
   **/
  PalletLotteryEvent: {
    _enum: {
      LotteryStarted: string;
      CallsUpdated: string;
      Winner: {
        winner: string;
        lotteryBalance: string;
      };
      TicketBought: {
        who: string;
        callIndex: string;
      };
    };
  };
  /**
   * Lookup100: pallet_nis::pallet::Event<T>
   **/
  PalletNisEvent: {
    _enum: {
      BidPlaced: {
        who: string;
        amount: string;
        duration: string;
      };
      BidRetracted: {
        who: string;
        amount: string;
        duration: string;
      };
      BidDropped: {
        who: string;
        amount: string;
        duration: string;
      };
      Issued: {
        index: string;
        expiry: string;
        who: string;
        proportion: string;
        amount: string;
      };
      Thawed: {
        index: string;
        who: string;
        proportion: string;
        amount: string;
        dropped: string;
      };
      Funded: {
        deficit: string;
      };
      Transferred: {
        from: string;
        to: string;
        index: string;
      };
    };
  };
  /**
   * Lookup102: pallet_uniques::pallet::Event<T, I>
   **/
  PalletUniquesEvent: {
    _enum: {
      Created: {
        collection: string;
        creator: string;
        owner: string;
      };
      ForceCreated: {
        collection: string;
        owner: string;
      };
      Destroyed: {
        collection: string;
      };
      Issued: {
        collection: string;
        item: string;
        owner: string;
      };
      Transferred: {
        collection: string;
        item: string;
        from: string;
        to: string;
      };
      Burned: {
        collection: string;
        item: string;
        owner: string;
      };
      Frozen: {
        collection: string;
        item: string;
      };
      Thawed: {
        collection: string;
        item: string;
      };
      CollectionFrozen: {
        collection: string;
      };
      CollectionThawed: {
        collection: string;
      };
      OwnerChanged: {
        collection: string;
        newOwner: string;
      };
      TeamChanged: {
        collection: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      ApprovedTransfer: {
        collection: string;
        item: string;
        owner: string;
        delegate: string;
      };
      ApprovalCancelled: {
        collection: string;
        item: string;
        owner: string;
        delegate: string;
      };
      ItemStatusChanged: {
        collection: string;
      };
      CollectionMetadataSet: {
        collection: string;
        data: string;
        isFrozen: string;
      };
      CollectionMetadataCleared: {
        collection: string;
      };
      MetadataSet: {
        collection: string;
        item: string;
        data: string;
        isFrozen: string;
      };
      MetadataCleared: {
        collection: string;
        item: string;
      };
      Redeposited: {
        collection: string;
        successfulItems: string;
      };
      AttributeSet: {
        collection: string;
        maybeItem: string;
        key: string;
        value: string;
      };
      AttributeCleared: {
        collection: string;
        maybeItem: string;
        key: string;
      };
      OwnershipAcceptanceChanged: {
        who: string;
        maybeCollection: string;
      };
      CollectionMaxSupplySet: {
        collection: string;
        maxSupply: string;
      };
      ItemPriceSet: {
        collection: string;
        item: string;
        price: string;
        whitelistedBuyer: string;
      };
      ItemPriceRemoved: {
        collection: string;
        item: string;
      };
      ItemBought: {
        collection: string;
        item: string;
        price: string;
        seller: string;
        buyer: string;
      };
    };
  };
  /**
   * Lookup107: pallet_nfts::pallet::Event<T, I>
   **/
  PalletNftsEvent: {
    _enum: {
      Created: {
        collection: string;
        creator: string;
        owner: string;
      };
      ForceCreated: {
        collection: string;
        owner: string;
      };
      Destroyed: {
        collection: string;
      };
      Issued: {
        collection: string;
        item: string;
        owner: string;
      };
      Transferred: {
        collection: string;
        item: string;
        from: string;
        to: string;
      };
      Burned: {
        collection: string;
        item: string;
        owner: string;
      };
      ItemTransferLocked: {
        collection: string;
        item: string;
      };
      ItemTransferUnlocked: {
        collection: string;
        item: string;
      };
      ItemPropertiesLocked: {
        collection: string;
        item: string;
        lockMetadata: string;
        lockAttributes: string;
      };
      CollectionLocked: {
        collection: string;
      };
      OwnerChanged: {
        collection: string;
        newOwner: string;
      };
      TeamChanged: {
        collection: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      TransferApproved: {
        collection: string;
        item: string;
        owner: string;
        delegate: string;
        deadline: string;
      };
      ApprovalCancelled: {
        collection: string;
        item: string;
        owner: string;
        delegate: string;
      };
      AllApprovalsCancelled: {
        collection: string;
        item: string;
        owner: string;
      };
      CollectionConfigChanged: {
        collection: string;
      };
      CollectionMetadataSet: {
        collection: string;
        data: string;
      };
      CollectionMetadataCleared: {
        collection: string;
      };
      ItemMetadataSet: {
        collection: string;
        item: string;
        data: string;
      };
      ItemMetadataCleared: {
        collection: string;
        item: string;
      };
      Redeposited: {
        collection: string;
        successfulItems: string;
      };
      AttributeSet: {
        collection: string;
        maybeItem: string;
        key: string;
        value: string;
        namespace: string;
      };
      AttributeCleared: {
        collection: string;
        maybeItem: string;
        key: string;
        namespace: string;
      };
      ItemAttributesApprovalAdded: {
        collection: string;
        item: string;
        delegate: string;
      };
      ItemAttributesApprovalRemoved: {
        collection: string;
        item: string;
        delegate: string;
      };
      OwnershipAcceptanceChanged: {
        who: string;
        maybeCollection: string;
      };
      CollectionMaxSupplySet: {
        collection: string;
        maxSupply: string;
      };
      CollectionMintSettingsUpdated: {
        collection: string;
      };
      NextCollectionIdIncremented: {
        nextId: string;
      };
      ItemPriceSet: {
        collection: string;
        item: string;
        price: string;
        whitelistedBuyer: string;
      };
      ItemPriceRemoved: {
        collection: string;
        item: string;
      };
      ItemBought: {
        collection: string;
        item: string;
        price: string;
        seller: string;
        buyer: string;
      };
      TipSent: {
        collection: string;
        item: string;
        sender: string;
        receiver: string;
        amount: string;
      };
      SwapCreated: {
        offeredCollection: string;
        offeredItem: string;
        desiredCollection: string;
        desiredItem: string;
        price: string;
        deadline: string;
      };
      SwapCancelled: {
        offeredCollection: string;
        offeredItem: string;
        desiredCollection: string;
        desiredItem: string;
        price: string;
        deadline: string;
      };
      SwapClaimed: {
        sentCollection: string;
        sentItem: string;
        sentItemOwner: string;
        receivedCollection: string;
        receivedItem: string;
        receivedItemOwner: string;
        price: string;
        deadline: string;
      };
    };
  };
  /**
   * Lookup108: frame_support::traits::tokens::misc::AttributeNamespace<sp_core::crypto::AccountId32>
   **/
  FrameSupportTokensMiscAttributeNamespace: {
    _enum: {
      Pallet: string;
      CollectionOwner: string;
      ItemOwner: string;
      Account: string;
    };
  };
  /**
   * Lookup110: pallet_nfts::types::PriceWithDirection<Amount>
   **/
  PalletNftsPriceWithDirection: {
    amount: string;
    direction: string;
  };
  /**
   * Lookup111: pallet_nfts::types::PriceDirection
   **/
  PalletNftsPriceDirection: {
    _enum: string[];
  };
  /**
   * Lookup112: pallet_transaction_storage::pallet::Event<T>
   **/
  PalletTransactionStorageEvent: {
    _enum: {
      Stored: {
        index: string;
      };
      Renewed: {
        index: string;
      };
      ProofChecked: string;
    };
  };
  /**
   * Lookup113: pallet_bags_list::pallet::Event<T, I>
   **/
  PalletBagsListEvent: {
    _enum: {
      Rebagged: {
        who: string;
        from: string;
        to: string;
      };
      ScoreUpdated: {
        who: string;
        newScore: string;
      };
    };
  };
  /**
   * Lookup114: pallet_state_trie_migration::pallet::Event<T>
   **/
  PalletStateTrieMigrationEvent: {
    _enum: {
      Migrated: {
        top: string;
        child: string;
        compute: string;
      };
      Slashed: {
        who: string;
        amount: string;
      };
      AutoMigrationFinished: string;
      Halted: {
        error: string;
      };
    };
  };
  /**
   * Lookup115: pallet_state_trie_migration::pallet::MigrationCompute
   **/
  PalletStateTrieMigrationMigrationCompute: {
    _enum: string[];
  };
  /**
   * Lookup116: pallet_state_trie_migration::pallet::Error<T>
   **/
  PalletStateTrieMigrationError: {
    _enum: string[];
  };
  /**
   * Lookup117: pallet_child_bounties::pallet::Event<T>
   **/
  PalletChildBountiesEvent: {
    _enum: {
      Added: {
        index: string;
        childIndex: string;
      };
      Awarded: {
        index: string;
        childIndex: string;
        beneficiary: string;
      };
      Claimed: {
        index: string;
        childIndex: string;
        payout: string;
        beneficiary: string;
      };
      Canceled: {
        index: string;
        childIndex: string;
      };
    };
  };
  /**
   * Lookup118: pallet_referenda::pallet::Event<T, I>
   **/
  PalletReferendaEvent: {
    _enum: {
      Submitted: {
        index: string;
        track: string;
        proposal: string;
      };
      DecisionDepositPlaced: {
        index: string;
        who: string;
        amount: string;
      };
      DecisionDepositRefunded: {
        index: string;
        who: string;
        amount: string;
      };
      DepositSlashed: {
        who: string;
        amount: string;
      };
      DecisionStarted: {
        index: string;
        track: string;
        proposal: string;
        tally: string;
      };
      ConfirmStarted: {
        index: string;
      };
      ConfirmAborted: {
        index: string;
      };
      Confirmed: {
        index: string;
        tally: string;
      };
      Approved: {
        index: string;
      };
      Rejected: {
        index: string;
        tally: string;
      };
      TimedOut: {
        index: string;
        tally: string;
      };
      Cancelled: {
        index: string;
        tally: string;
      };
      Killed: {
        index: string;
        tally: string;
      };
      SubmissionDepositRefunded: {
        index: string;
        who: string;
        amount: string;
      };
      MetadataSet: {
        _alias: {
          hash_: string;
        };
        index: string;
        hash_: string;
      };
      MetadataCleared: {
        _alias: {
          hash_: string;
        };
        index: string;
        hash_: string;
      };
    };
  };
  /**
   * Lookup119: frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>
   **/
  FrameSupportPreimagesBounded: {
    _enum: {
      Legacy: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      Inline: string;
      Lookup: {
        _alias: {
          hash_: string;
        };
        hash_: string;
        len: string;
      };
    };
  };
  /**
   * Lookup121: frame_system::pallet::Call<T>
   **/
  FrameSystemCall: {
    _enum: {
      remark: {
        remark: string;
      };
      set_heap_pages: {
        pages: string;
      };
      set_code: {
        code: string;
      };
      set_code_without_checks: {
        code: string;
      };
      set_storage: {
        items: string;
      };
      kill_storage: {
        _alias: {
          keys_: string;
        };
        keys_: string;
      };
      kill_prefix: {
        prefix: string;
        subkeys: string;
      };
      remark_with_event: {
        remark: string;
      };
    };
  };
  /**
   * Lookup125: pallet_utility::pallet::Call<T>
   **/
  PalletUtilityCall: {
    _enum: {
      batch: {
        calls: string;
      };
      as_derivative: {
        index: string;
        call: string;
      };
      batch_all: {
        calls: string;
      };
      dispatch_as: {
        asOrigin: string;
        call: string;
      };
      force_batch: {
        calls: string;
      };
      with_weight: {
        call: string;
        weight: string;
      };
    };
  };
  /**
   * Lookup127: kitchensink_runtime::OriginCaller
   **/
  KitchensinkRuntimeOriginCaller: {
    _enum: {
      system: string;
      __Unused1: string;
      __Unused2: string;
      __Unused3: string;
      Void: string;
      __Unused5: string;
      __Unused6: string;
      __Unused7: string;
      __Unused8: string;
      __Unused9: string;
      __Unused10: string;
      __Unused11: string;
      __Unused12: string;
      Council: string;
      TechnicalCommittee: string;
      __Unused15: string;
      __Unused16: string;
      __Unused17: string;
      __Unused18: string;
      __Unused19: string;
      __Unused20: string;
      __Unused21: string;
      __Unused22: string;
      __Unused23: string;
      __Unused24: string;
      __Unused25: string;
      __Unused26: string;
      __Unused27: string;
      __Unused28: string;
      __Unused29: string;
      __Unused30: string;
      __Unused31: string;
      __Unused32: string;
      __Unused33: string;
      __Unused34: string;
      __Unused35: string;
      __Unused36: string;
      __Unused37: string;
      __Unused38: string;
      __Unused39: string;
      __Unused40: string;
      __Unused41: string;
      __Unused42: string;
      __Unused43: string;
      __Unused44: string;
      __Unused45: string;
      __Unused46: string;
      __Unused47: string;
      __Unused48: string;
      __Unused49: string;
      __Unused50: string;
      AllianceMotion: string;
    };
  };
  /**
   * Lookup128: frame_support::dispatch::RawOrigin<sp_core::crypto::AccountId32>
   **/
  FrameSupportDispatchRawOrigin: {
    _enum: {
      Root: string;
      Signed: string;
      None: string;
    };
  };
  /**
   * Lookup129: pallet_collective::RawOrigin<sp_core::crypto::AccountId32, I>
   **/
  PalletCollectiveRawOrigin: {
    _enum: {
      Members: string;
      Member: string;
      _Phantom: string;
    };
  };
  /**
   * Lookup132: sp_core::Void
   **/
  SpCoreVoid: string;
  /**
   * Lookup133: pallet_babe::pallet::Call<T>
   **/
  PalletBabeCall: {
    _enum: {
      report_equivocation: {
        equivocationProof: string;
        keyOwnerProof: string;
      };
      report_equivocation_unsigned: {
        equivocationProof: string;
        keyOwnerProof: string;
      };
      plan_config_change: {
        config: string;
      };
    };
  };
  /**
   * Lookup134: sp_consensus_slots::EquivocationProof<sp_runtime::generic::header::Header<Number, sp_runtime::traits::BlakeTwo256>, sp_consensus_babe::app::Public>
   **/
  SpConsensusSlotsEquivocationProof: {
    offender: string;
    slot: string;
    firstHeader: string;
    secondHeader: string;
  };
  /**
   * Lookup135: sp_runtime::generic::header::Header<Number, sp_runtime::traits::BlakeTwo256>
   **/
  SpRuntimeHeader: {
    parentHash: string;
    number: string;
    stateRoot: string;
    extrinsicsRoot: string;
    digest: string;
  };
  /**
   * Lookup136: sp_runtime::traits::BlakeTwo256
   **/
  SpRuntimeBlakeTwo256: string;
  /**
   * Lookup138: sp_consensus_babe::app::Public
   **/
  SpConsensusBabeAppPublic: string;
  /**
   * Lookup140: sp_session::MembershipProof
   **/
  SpSessionMembershipProof: {
    session: string;
    trieNodes: string;
    validatorCount: string;
  };
  /**
   * Lookup141: sp_consensus_babe::digests::NextConfigDescriptor
   **/
  SpConsensusBabeDigestsNextConfigDescriptor: {
    _enum: {
      __Unused0: string;
      V1: {
        c: string;
        allowedSlots: string;
      };
    };
  };
  /**
   * Lookup143: sp_consensus_babe::AllowedSlots
   **/
  SpConsensusBabeAllowedSlots: {
    _enum: string[];
  };
  /**
   * Lookup144: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: string;
      };
    };
  };
  /**
   * Lookup145: pallet_indices::pallet::Call<T>
   **/
  PalletIndicesCall: {
    _enum: {
      claim: {
        index: string;
      };
      transfer: {
        _alias: {
          new_: string;
        };
        new_: string;
        index: string;
      };
      free: {
        index: string;
      };
      force_transfer: {
        _alias: {
          new_: string;
        };
        new_: string;
        index: string;
        freeze: string;
      };
      freeze: {
        index: string;
      };
    };
  };
  /**
   * Lookup148: pallet_balances::pallet::Call<T, I>
   **/
  PalletBalancesCall: {
    _enum: {
      transfer: {
        dest: string;
        value: string;
      };
      set_balance: {
        who: string;
        newFree: string;
        newReserved: string;
      };
      force_transfer: {
        source: string;
        dest: string;
        value: string;
      };
      transfer_keep_alive: {
        dest: string;
        value: string;
      };
      transfer_all: {
        dest: string;
        keepAlive: string;
      };
      force_unreserve: {
        who: string;
        amount: string;
      };
    };
  };
  /**
   * Lookup149: pallet_election_provider_multi_phase::pallet::Call<T>
   **/
  PalletElectionProviderMultiPhaseCall: {
    _enum: {
      submit_unsigned: {
        rawSolution: string;
        witness: string;
      };
      set_minimum_untrusted_score: {
        maybeNextScore: string;
      };
      set_emergency_election_result: {
        supports: string;
      };
      submit: {
        rawSolution: string;
      };
      governance_fallback: {
        maybeMaxVoters: string;
        maybeMaxTargets: string;
      };
    };
  };
  /**
   * Lookup150: pallet_election_provider_multi_phase::RawSolution<kitchensink_runtime::NposSolution16>
   **/
  PalletElectionProviderMultiPhaseRawSolution: {
    solution: string;
    score: string;
    round: string;
  };
  /**
   * Lookup151: kitchensink_runtime::NposSolution16
   **/
  KitchensinkRuntimeNposSolution16: {
    votes1: string;
    votes2: string;
    votes3: string;
    votes4: string;
    votes5: string;
    votes6: string;
    votes7: string;
    votes8: string;
    votes9: string;
    votes10: string;
    votes11: string;
    votes12: string;
    votes13: string;
    votes14: string;
    votes15: string;
    votes16: string;
  };
  /**
   * Lookup202: pallet_election_provider_multi_phase::SolutionOrSnapshotSize
   **/
  PalletElectionProviderMultiPhaseSolutionOrSnapshotSize: {
    voters: string;
    targets: string;
  };
  /**
   * Lookup206: sp_npos_elections::Support<sp_core::crypto::AccountId32>
   **/
  SpNposElectionsSupport: {
    total: string;
    voters: string;
  };
  /**
   * Lookup207: pallet_staking::pallet::pallet::Call<T>
   **/
  PalletStakingPalletCall: {
    _enum: {
      bond: {
        controller: string;
        value: string;
        payee: string;
      };
      bond_extra: {
        maxAdditional: string;
      };
      unbond: {
        value: string;
      };
      withdraw_unbonded: {
        numSlashingSpans: string;
      };
      validate: {
        prefs: string;
      };
      nominate: {
        targets: string;
      };
      chill: string;
      set_payee: {
        payee: string;
      };
      set_controller: {
        controller: string;
      };
      set_validator_count: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      increase_validator_count: {
        additional: string;
      };
      scale_validator_count: {
        factor: string;
      };
      force_no_eras: string;
      force_new_era: string;
      set_invulnerables: {
        invulnerables: string;
      };
      force_unstake: {
        stash: string;
        numSlashingSpans: string;
      };
      force_new_era_always: string;
      cancel_deferred_slash: {
        era: string;
        slashIndices: string;
      };
      payout_stakers: {
        validatorStash: string;
        era: string;
      };
      rebond: {
        value: string;
      };
      reap_stash: {
        stash: string;
        numSlashingSpans: string;
      };
      kick: {
        who: string;
      };
      set_staking_configs: {
        minNominatorBond: string;
        minValidatorBond: string;
        maxNominatorCount: string;
        maxValidatorCount: string;
        chillThreshold: string;
        minCommission: string;
      };
      chill_other: {
        controller: string;
      };
      force_apply_min_commission: {
        validatorStash: string;
      };
      set_min_commission: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
    };
  };
  /**
   * Lookup208: pallet_staking::RewardDestination<sp_core::crypto::AccountId32>
   **/
  PalletStakingRewardDestination: {
    _enum: {
      Staked: string;
      Stash: string;
      Controller: string;
      Account: string;
      None: string;
    };
  };
  /**
   * Lookup211: pallet_staking::pallet::pallet::ConfigOp<T>
   **/
  PalletStakingPalletConfigOpU128: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup212: pallet_staking::pallet::pallet::ConfigOp<T>
   **/
  PalletStakingPalletConfigOpU32: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup213: pallet_staking::pallet::pallet::ConfigOp<sp_arithmetic::per_things::Percent>
   **/
  PalletStakingPalletConfigOpPercent: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup214: pallet_staking::pallet::pallet::ConfigOp<sp_arithmetic::per_things::Perbill>
   **/
  PalletStakingPalletConfigOpPerbill: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup215: pallet_session::pallet::Call<T>
   **/
  PalletSessionCall: {
    _enum: {
      set_keys: {
        _alias: {
          keys_: string;
        };
        keys_: string;
        proof: string;
      };
      purge_keys: string;
    };
  };
  /**
   * Lookup216: kitchensink_runtime::SessionKeys
   **/
  KitchensinkRuntimeSessionKeys: {
    grandpa: string;
    babe: string;
    imOnline: string;
    authorityDiscovery: string;
  };
  /**
   * Lookup217: sp_authority_discovery::app::Public
   **/
  SpAuthorityDiscoveryAppPublic: string;
  /**
   * Lookup218: pallet_democracy::pallet::Call<T>
   **/
  PalletDemocracyCall: {
    _enum: {
      propose: {
        proposal: string;
        value: string;
      };
      second: {
        proposal: string;
      };
      vote: {
        refIndex: string;
        vote: string;
      };
      emergency_cancel: {
        refIndex: string;
      };
      external_propose: {
        proposal: string;
      };
      external_propose_majority: {
        proposal: string;
      };
      external_propose_default: {
        proposal: string;
      };
      fast_track: {
        proposalHash: string;
        votingPeriod: string;
        delay: string;
      };
      veto_external: {
        proposalHash: string;
      };
      cancel_referendum: {
        refIndex: string;
      };
      delegate: {
        to: string;
        conviction: string;
        balance: string;
      };
      undelegate: string;
      clear_public_proposals: string;
      unlock: {
        target: string;
      };
      remove_vote: {
        index: string;
      };
      remove_other_vote: {
        target: string;
        index: string;
      };
      blacklist: {
        proposalHash: string;
        maybeRefIndex: string;
      };
      cancel_proposal: {
        propIndex: string;
      };
      set_metadata: {
        owner: string;
        maybeHash: string;
      };
    };
  };
  /**
   * Lookup219: pallet_democracy::conviction::Conviction
   **/
  PalletDemocracyConviction: {
    _enum: string[];
  };
  /**
   * Lookup221: pallet_collective::pallet::Call<T, I>
   **/
  PalletCollectiveCall: {
    _enum: {
      set_members: {
        newMembers: string;
        prime: string;
        oldCount: string;
      };
      execute: {
        proposal: string;
        lengthBound: string;
      };
      propose: {
        threshold: string;
        proposal: string;
        lengthBound: string;
      };
      vote: {
        proposal: string;
        index: string;
        approve: string;
      };
      close_old_weight: {
        proposalHash: string;
        index: string;
        proposalWeightBound: string;
        lengthBound: string;
      };
      disapprove_proposal: {
        proposalHash: string;
      };
      close: {
        proposalHash: string;
        index: string;
        proposalWeightBound: string;
        lengthBound: string;
      };
    };
  };
  /**
   * Lookup225: pallet_elections_phragmen::pallet::Call<T>
   **/
  PalletElectionsPhragmenCall: {
    _enum: {
      vote: {
        votes: string;
        value: string;
      };
      remove_voter: string;
      submit_candidacy: {
        candidateCount: string;
      };
      renounce_candidacy: {
        renouncing: string;
      };
      remove_member: {
        who: string;
        slashBond: string;
        rerunElection: string;
      };
      clean_defunct_voters: {
        numVoters: string;
        numDefunct: string;
      };
    };
  };
  /**
   * Lookup226: pallet_elections_phragmen::Renouncing
   **/
  PalletElectionsPhragmenRenouncing: {
    _enum: {
      Member: string;
      RunnerUp: string;
      Candidate: string;
    };
  };
  /**
   * Lookup227: pallet_membership::pallet::Call<T, I>
   **/
  PalletMembershipCall: {
    _enum: {
      add_member: {
        who: string;
      };
      remove_member: {
        who: string;
      };
      swap_member: {
        remove: string;
        add: string;
      };
      reset_members: {
        members: string;
      };
      change_key: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_prime: {
        who: string;
      };
      clear_prime: string;
    };
  };
  /**
   * Lookup228: pallet_grandpa::pallet::Call<T>
   **/
  PalletGrandpaCall: {
    _enum: {
      report_equivocation: {
        equivocationProof: string;
        keyOwnerProof: string;
      };
      report_equivocation_unsigned: {
        equivocationProof: string;
        keyOwnerProof: string;
      };
      note_stalled: {
        delay: string;
        bestFinalizedBlockNumber: string;
      };
    };
  };
  /**
   * Lookup229: sp_finality_grandpa::EquivocationProof<primitive_types::H256, N>
   **/
  SpFinalityGrandpaEquivocationProof: {
    setId: string;
    equivocation: string;
  };
  /**
   * Lookup230: sp_finality_grandpa::Equivocation<primitive_types::H256, N>
   **/
  SpFinalityGrandpaEquivocation: {
    _enum: {
      Prevote: string;
      Precommit: string;
    };
  };
  /**
   * Lookup231: finality_grandpa::Equivocation<sp_finality_grandpa::app::Public, finality_grandpa::Prevote<primitive_types::H256, N>, sp_finality_grandpa::app::Signature>
   **/
  FinalityGrandpaEquivocationPrevote: {
    roundNumber: string;
    identity: string;
    first: string;
    second: string;
  };
  /**
   * Lookup232: finality_grandpa::Prevote<primitive_types::H256, N>
   **/
  FinalityGrandpaPrevote: {
    targetHash: string;
    targetNumber: string;
  };
  /**
   * Lookup233: sp_finality_grandpa::app::Signature
   **/
  SpFinalityGrandpaAppSignature: string;
  /**
   * Lookup234: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: string;
  /**
   * Lookup237: finality_grandpa::Equivocation<sp_finality_grandpa::app::Public, finality_grandpa::Precommit<primitive_types::H256, N>, sp_finality_grandpa::app::Signature>
   **/
  FinalityGrandpaEquivocationPrecommit: {
    roundNumber: string;
    identity: string;
    first: string;
    second: string;
  };
  /**
   * Lookup238: finality_grandpa::Precommit<primitive_types::H256, N>
   **/
  FinalityGrandpaPrecommit: {
    targetHash: string;
    targetNumber: string;
  };
  /**
   * Lookup240: pallet_treasury::pallet::Call<T, I>
   **/
  PalletTreasuryCall: {
    _enum: {
      propose_spend: {
        value: string;
        beneficiary: string;
      };
      reject_proposal: {
        proposalId: string;
      };
      approve_proposal: {
        proposalId: string;
      };
      spend: {
        amount: string;
        beneficiary: string;
      };
      remove_approval: {
        proposalId: string;
      };
    };
  };
  /**
   * Lookup241: pallet_contracts::pallet::Call<T>
   **/
  PalletContractsCall: {
    _enum: {
      call_old_weight: {
        dest: string;
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        data: string;
      };
      instantiate_with_code_old_weight: {
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        code: string;
        data: string;
        salt: string;
      };
      instantiate_old_weight: {
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        codeHash: string;
        data: string;
        salt: string;
      };
      upload_code: {
        code: string;
        storageDepositLimit: string;
        determinism: string;
      };
      remove_code: {
        codeHash: string;
      };
      set_code: {
        dest: string;
        codeHash: string;
      };
      call: {
        dest: string;
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        data: string;
      };
      instantiate_with_code: {
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        code: string;
        data: string;
        salt: string;
      };
      instantiate: {
        value: string;
        gasLimit: string;
        storageDepositLimit: string;
        codeHash: string;
        data: string;
        salt: string;
      };
    };
  };
  /**
   * Lookup243: pallet_contracts::wasm::Determinism
   **/
  PalletContractsWasmDeterminism: {
    _enum: string[];
  };
  /**
   * Lookup244: pallet_sudo::pallet::Call<T>
   **/
  PalletSudoCall: {
    _enum: {
      sudo: {
        call: string;
      };
      sudo_unchecked_weight: {
        call: string;
        weight: string;
      };
      set_key: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      sudo_as: {
        who: string;
        call: string;
      };
    };
  };
  /**
   * Lookup245: pallet_im_online::pallet::Call<T>
   **/
  PalletImOnlineCall: {
    _enum: {
      heartbeat: {
        heartbeat: string;
        signature: string;
      };
    };
  };
  /**
   * Lookup246: pallet_im_online::Heartbeat<BlockNumber>
   **/
  PalletImOnlineHeartbeat: {
    blockNumber: string;
    networkState: string;
    sessionIndex: string;
    authorityIndex: string;
    validatorsLen: string;
  };
  /**
   * Lookup247: sp_core::offchain::OpaqueNetworkState
   **/
  SpCoreOffchainOpaqueNetworkState: {
    peerId: string;
    externalAddresses: string;
  };
  /**
   * Lookup251: pallet_im_online::sr25519::app_sr25519::Signature
   **/
  PalletImOnlineSr25519AppSr25519Signature: string;
  /**
   * Lookup252: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: string;
  /**
   * Lookup253: pallet_identity::pallet::Call<T>
   **/
  PalletIdentityCall: {
    _enum: {
      add_registrar: {
        account: string;
      };
      set_identity: {
        info: string;
      };
      set_subs: {
        subs: string;
      };
      clear_identity: string;
      request_judgement: {
        regIndex: string;
        maxFee: string;
      };
      cancel_request: {
        regIndex: string;
      };
      set_fee: {
        index: string;
        fee: string;
      };
      set_account_id: {
        _alias: {
          new_: string;
        };
        index: string;
        new_: string;
      };
      set_fields: {
        index: string;
        fields: string;
      };
      provide_judgement: {
        regIndex: string;
        target: string;
        judgement: string;
        identity: string;
      };
      kill_identity: {
        target: string;
      };
      add_sub: {
        sub: string;
        data: string;
      };
      rename_sub: {
        sub: string;
        data: string;
      };
      remove_sub: {
        sub: string;
      };
      quit_sub: string;
    };
  };
  /**
   * Lookup254: pallet_identity::types::IdentityInfo<FieldLimit>
   **/
  PalletIdentityIdentityInfo: {
    additional: string;
    display: string;
    legal: string;
    web: string;
    riot: string;
    email: string;
    pgpFingerprint: string;
    image: string;
    twitter: string;
  };
  /**
   * Lookup291: pallet_identity::types::BitFlags<pallet_identity::types::IdentityField>
   **/
  PalletIdentityBitFlags: {
    _bitLength: number;
    Display: number;
    Legal: number;
    Web: number;
    Riot: number;
    Email: number;
    PgpFingerprint: number;
    Image: number;
    Twitter: number;
  };
  /**
   * Lookup292: pallet_identity::types::IdentityField
   **/
  PalletIdentityIdentityField: {
    _enum: string[];
  };
  /**
   * Lookup293: pallet_identity::types::Judgement<Balance>
   **/
  PalletIdentityJudgement: {
    _enum: {
      Unknown: string;
      FeePaid: string;
      Reasonable: string;
      KnownGood: string;
      OutOfDate: string;
      LowQuality: string;
      Erroneous: string;
    };
  };
  /**
   * Lookup294: pallet_society::pallet::Call<T, I>
   **/
  PalletSocietyCall: {
    _enum: {
      bid: {
        value: string;
      };
      unbid: {
        pos: string;
      };
      vouch: {
        who: string;
        value: string;
        tip: string;
      };
      unvouch: {
        pos: string;
      };
      vote: {
        candidate: string;
        approve: string;
      };
      defender_vote: {
        approve: string;
      };
      payout: string;
      found: {
        founder: string;
        maxMembers: string;
        rules: string;
      };
      unfound: string;
      judge_suspended_member: {
        who: string;
        forgive: string;
      };
      judge_suspended_candidate: {
        who: string;
        judgement: string;
      };
      set_max_members: {
        max: string;
      };
    };
  };
  /**
   * Lookup295: pallet_society::Judgement
   **/
  PalletSocietyJudgement: {
    _enum: string[];
  };
  /**
   * Lookup296: pallet_recovery::pallet::Call<T>
   **/
  PalletRecoveryCall: {
    _enum: {
      as_recovered: {
        account: string;
        call: string;
      };
      set_recovered: {
        lost: string;
        rescuer: string;
      };
      create_recovery: {
        friends: string;
        threshold: string;
        delayPeriod: string;
      };
      initiate_recovery: {
        account: string;
      };
      vouch_recovery: {
        lost: string;
        rescuer: string;
      };
      claim_recovery: {
        account: string;
      };
      close_recovery: {
        rescuer: string;
      };
      remove_recovery: string;
      cancel_recovered: {
        account: string;
      };
    };
  };
  /**
   * Lookup297: pallet_vesting::pallet::Call<T>
   **/
  PalletVestingCall: {
    _enum: {
      vest: string;
      vest_other: {
        target: string;
      };
      vested_transfer: {
        target: string;
        schedule: string;
      };
      force_vested_transfer: {
        source: string;
        target: string;
        schedule: string;
      };
      merge_schedules: {
        schedule1Index: string;
        schedule2Index: string;
      };
    };
  };
  /**
   * Lookup298: pallet_vesting::vesting_info::VestingInfo<Balance, BlockNumber>
   **/
  PalletVestingVestingInfo: {
    locked: string;
    perBlock: string;
    startingBlock: string;
  };
  /**
   * Lookup299: pallet_scheduler::pallet::Call<T>
   **/
  PalletSchedulerCall: {
    _enum: {
      schedule: {
        when: string;
        maybePeriodic: string;
        priority: string;
        call: string;
      };
      cancel: {
        when: string;
        index: string;
      };
      schedule_named: {
        id: string;
        when: string;
        maybePeriodic: string;
        priority: string;
        call: string;
      };
      cancel_named: {
        id: string;
      };
      schedule_after: {
        after: string;
        maybePeriodic: string;
        priority: string;
        call: string;
      };
      schedule_named_after: {
        id: string;
        after: string;
        maybePeriodic: string;
        priority: string;
        call: string;
      };
    };
  };
  /**
   * Lookup301: pallet_preimage::pallet::Call<T>
   **/
  PalletPreimageCall: {
    _enum: {
      note_preimage: {
        bytes: string;
      };
      unnote_preimage: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      request_preimage: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      unrequest_preimage: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
    };
  };
  /**
   * Lookup302: pallet_proxy::pallet::Call<T>
   **/
  PalletProxyCall: {
    _enum: {
      proxy: {
        real: string;
        forceProxyType: string;
        call: string;
      };
      add_proxy: {
        delegate: string;
        proxyType: string;
        delay: string;
      };
      remove_proxy: {
        delegate: string;
        proxyType: string;
        delay: string;
      };
      remove_proxies: string;
      create_pure: {
        proxyType: string;
        delay: string;
        index: string;
      };
      kill_pure: {
        spawner: string;
        proxyType: string;
        index: string;
        height: string;
        extIndex: string;
      };
      announce: {
        real: string;
        callHash: string;
      };
      remove_announcement: {
        real: string;
        callHash: string;
      };
      reject_announcement: {
        delegate: string;
        callHash: string;
      };
      proxy_announced: {
        delegate: string;
        real: string;
        forceProxyType: string;
        call: string;
      };
    };
  };
  /**
   * Lookup304: pallet_multisig::pallet::Call<T>
   **/
  PalletMultisigCall: {
    _enum: {
      as_multi_threshold_1: {
        otherSignatories: string;
        call: string;
      };
      as_multi: {
        threshold: string;
        otherSignatories: string;
        maybeTimepoint: string;
        call: string;
        maxWeight: string;
      };
      approve_as_multi: {
        threshold: string;
        otherSignatories: string;
        maybeTimepoint: string;
        callHash: string;
        maxWeight: string;
      };
      cancel_as_multi: {
        threshold: string;
        otherSignatories: string;
        timepoint: string;
        callHash: string;
      };
    };
  };
  /**
   * Lookup306: pallet_bounties::pallet::Call<T, I>
   **/
  PalletBountiesCall: {
    _enum: {
      propose_bounty: {
        value: string;
        description: string;
      };
      approve_bounty: {
        bountyId: string;
      };
      propose_curator: {
        bountyId: string;
        curator: string;
        fee: string;
      };
      unassign_curator: {
        bountyId: string;
      };
      accept_curator: {
        bountyId: string;
      };
      award_bounty: {
        bountyId: string;
        beneficiary: string;
      };
      claim_bounty: {
        bountyId: string;
      };
      close_bounty: {
        bountyId: string;
      };
      extend_bounty_expiry: {
        bountyId: string;
        remark: string;
      };
    };
  };
  /**
   * Lookup307: pallet_tips::pallet::Call<T, I>
   **/
  PalletTipsCall: {
    _enum: {
      report_awesome: {
        reason: string;
        who: string;
      };
      retract_tip: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      tip_new: {
        reason: string;
        who: string;
        tipValue: string;
      };
      tip: {
        _alias: {
          hash_: string;
        };
        hash_: string;
        tipValue: string;
      };
      close_tip: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      slash_tip: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
    };
  };
  /**
   * Lookup308: pallet_assets::pallet::Call<T, I>
   **/
  PalletAssetsCall: {
    _enum: {
      create: {
        id: string;
        admin: string;
        minBalance: string;
      };
      force_create: {
        id: string;
        owner: string;
        isSufficient: string;
        minBalance: string;
      };
      start_destroy: {
        id: string;
      };
      destroy_accounts: {
        id: string;
      };
      destroy_approvals: {
        id: string;
      };
      finish_destroy: {
        id: string;
      };
      mint: {
        id: string;
        beneficiary: string;
        amount: string;
      };
      burn: {
        id: string;
        who: string;
        amount: string;
      };
      transfer: {
        id: string;
        target: string;
        amount: string;
      };
      transfer_keep_alive: {
        id: string;
        target: string;
        amount: string;
      };
      force_transfer: {
        id: string;
        source: string;
        dest: string;
        amount: string;
      };
      freeze: {
        id: string;
        who: string;
      };
      thaw: {
        id: string;
        who: string;
      };
      freeze_asset: {
        id: string;
      };
      thaw_asset: {
        id: string;
      };
      transfer_ownership: {
        id: string;
        owner: string;
      };
      set_team: {
        id: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      set_metadata: {
        id: string;
        name: string;
        symbol: string;
        decimals: string;
      };
      clear_metadata: {
        id: string;
      };
      force_set_metadata: {
        id: string;
        name: string;
        symbol: string;
        decimals: string;
        isFrozen: string;
      };
      force_clear_metadata: {
        id: string;
      };
      force_asset_status: {
        id: string;
        owner: string;
        issuer: string;
        admin: string;
        freezer: string;
        minBalance: string;
        isSufficient: string;
        isFrozen: string;
      };
      approve_transfer: {
        id: string;
        delegate: string;
        amount: string;
      };
      cancel_approval: {
        id: string;
        delegate: string;
      };
      force_cancel_approval: {
        id: string;
        owner: string;
        delegate: string;
      };
      transfer_approved: {
        id: string;
        owner: string;
        destination: string;
        amount: string;
      };
      touch: {
        id: string;
      };
      refund: {
        id: string;
        allowBurn: string;
      };
    };
  };
  /**
   * Lookup309: pallet_lottery::pallet::Call<T>
   **/
  PalletLotteryCall: {
    _enum: {
      buy_ticket: {
        call: string;
      };
      set_calls: {
        calls: string;
      };
      start_lottery: {
        price: string;
        length: string;
        delay: string;
        repeat: string;
      };
      stop_repeat: string;
    };
  };
  /**
   * Lookup310: pallet_nis::pallet::Call<T>
   **/
  PalletNisCall: {
    _enum: {
      place_bid: {
        amount: string;
        duration: string;
      };
      retract_bid: {
        amount: string;
        duration: string;
      };
      fund_deficit: string;
      thaw_private: {
        index: string;
        maybeProportion: string;
      };
      thaw_communal: {
        index: string;
      };
      communify: {
        index: string;
      };
      privatize: {
        index: string;
      };
    };
  };
  /**
   * Lookup312: pallet_uniques::pallet::Call<T, I>
   **/
  PalletUniquesCall: {
    _enum: {
      create: {
        collection: string;
        admin: string;
      };
      force_create: {
        collection: string;
        owner: string;
        freeHolding: string;
      };
      destroy: {
        collection: string;
        witness: string;
      };
      mint: {
        collection: string;
        item: string;
        owner: string;
      };
      burn: {
        collection: string;
        item: string;
        checkOwner: string;
      };
      transfer: {
        collection: string;
        item: string;
        dest: string;
      };
      redeposit: {
        collection: string;
        items: string;
      };
      freeze: {
        collection: string;
        item: string;
      };
      thaw: {
        collection: string;
        item: string;
      };
      freeze_collection: {
        collection: string;
      };
      thaw_collection: {
        collection: string;
      };
      transfer_ownership: {
        collection: string;
        owner: string;
      };
      set_team: {
        collection: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      approve_transfer: {
        collection: string;
        item: string;
        delegate: string;
      };
      cancel_approval: {
        collection: string;
        item: string;
        maybeCheckDelegate: string;
      };
      force_item_status: {
        collection: string;
        owner: string;
        issuer: string;
        admin: string;
        freezer: string;
        freeHolding: string;
        isFrozen: string;
      };
      set_attribute: {
        collection: string;
        maybeItem: string;
        key: string;
        value: string;
      };
      clear_attribute: {
        collection: string;
        maybeItem: string;
        key: string;
      };
      set_metadata: {
        collection: string;
        item: string;
        data: string;
        isFrozen: string;
      };
      clear_metadata: {
        collection: string;
        item: string;
      };
      set_collection_metadata: {
        collection: string;
        data: string;
        isFrozen: string;
      };
      clear_collection_metadata: {
        collection: string;
      };
      set_accept_ownership: {
        maybeCollection: string;
      };
      set_collection_max_supply: {
        collection: string;
        maxSupply: string;
      };
      set_price: {
        collection: string;
        item: string;
        price: string;
        whitelistedBuyer: string;
      };
      buy_item: {
        collection: string;
        item: string;
        bidPrice: string;
      };
    };
  };
  /**
   * Lookup313: pallet_uniques::types::DestroyWitness
   **/
  PalletUniquesDestroyWitness: {
    items: string;
    itemMetadatas: string;
    attributes: string;
  };
  /**
   * Lookup316: pallet_nfts::pallet::Call<T, I>
   **/
  PalletNftsCall: {
    _enum: {
      create: {
        admin: string;
        config: string;
      };
      force_create: {
        owner: string;
        config: string;
      };
      destroy: {
        collection: string;
        witness: string;
      };
      mint: {
        collection: string;
        item: string;
        mintTo: string;
        witnessData: string;
      };
      force_mint: {
        collection: string;
        item: string;
        mintTo: string;
        itemConfig: string;
      };
      burn: {
        collection: string;
        item: string;
        checkOwner: string;
      };
      transfer: {
        collection: string;
        item: string;
        dest: string;
      };
      redeposit: {
        collection: string;
        items: string;
      };
      lock_item_transfer: {
        collection: string;
        item: string;
      };
      unlock_item_transfer: {
        collection: string;
        item: string;
      };
      lock_collection: {
        collection: string;
        lockSettings: string;
      };
      transfer_ownership: {
        collection: string;
        owner: string;
      };
      set_team: {
        collection: string;
        issuer: string;
        admin: string;
        freezer: string;
      };
      force_collection_owner: {
        collection: string;
        owner: string;
      };
      force_collection_config: {
        collection: string;
        config: string;
      };
      approve_transfer: {
        collection: string;
        item: string;
        delegate: string;
        maybeDeadline: string;
      };
      cancel_approval: {
        collection: string;
        item: string;
        delegate: string;
      };
      clear_all_transfer_approvals: {
        collection: string;
        item: string;
      };
      lock_item_properties: {
        collection: string;
        item: string;
        lockMetadata: string;
        lockAttributes: string;
      };
      set_attribute: {
        collection: string;
        maybeItem: string;
        namespace: string;
        key: string;
        value: string;
      };
      force_set_attribute: {
        setAs: string;
        collection: string;
        maybeItem: string;
        namespace: string;
        key: string;
        value: string;
      };
      clear_attribute: {
        collection: string;
        maybeItem: string;
        namespace: string;
        key: string;
      };
      approve_item_attributes: {
        collection: string;
        item: string;
        delegate: string;
      };
      cancel_item_attributes_approval: {
        collection: string;
        item: string;
        delegate: string;
        witness: string;
      };
      set_metadata: {
        collection: string;
        item: string;
        data: string;
      };
      clear_metadata: {
        collection: string;
        item: string;
      };
      set_collection_metadata: {
        collection: string;
        data: string;
      };
      clear_collection_metadata: {
        collection: string;
      };
      set_accept_ownership: {
        maybeCollection: string;
      };
      set_collection_max_supply: {
        collection: string;
        maxSupply: string;
      };
      update_mint_settings: {
        collection: string;
        mintSettings: string;
      };
      set_price: {
        collection: string;
        item: string;
        price: string;
        whitelistedBuyer: string;
      };
      buy_item: {
        collection: string;
        item: string;
        bidPrice: string;
      };
      pay_tips: {
        tips: string;
      };
      create_swap: {
        offeredCollection: string;
        offeredItem: string;
        desiredCollection: string;
        maybeDesiredItem: string;
        maybePrice: string;
        duration: string;
      };
      cancel_swap: {
        offeredCollection: string;
        offeredItem: string;
      };
      claim_swap: {
        sendCollection: string;
        sendItem: string;
        receiveCollection: string;
        receiveItem: string;
        witnessPrice: string;
      };
      mint_pre_signed: {
        mintData: string;
        signature: string;
        signer: string;
      };
    };
  };
  /**
   * Lookup317: pallet_nfts::types::CollectionConfig<Price, BlockNumber, CollectionId>
   **/
  PalletNftsCollectionConfig: {
    settings: string;
    maxSupply: string;
    mintSettings: string;
  };
  /**
   * Lookup319: pallet_nfts::types::CollectionSetting
   **/
  PalletNftsCollectionSetting: {
    _enum: string[];
  };
  /**
   * Lookup320: pallet_nfts::types::MintSettings<Price, BlockNumber, CollectionId>
   **/
  PalletNftsMintSettings: {
    mintType: string;
    price: string;
    startBlock: string;
    endBlock: string;
    defaultItemSettings: string;
  };
  /**
   * Lookup321: pallet_nfts::types::MintType<CollectionId>
   **/
  PalletNftsMintType: {
    _enum: {
      Issuer: string;
      Public: string;
      HolderOf: string;
    };
  };
  /**
   * Lookup323: pallet_nfts::types::ItemSetting
   **/
  PalletNftsItemSetting: {
    _enum: string[];
  };
  /**
   * Lookup324: pallet_nfts::types::DestroyWitness
   **/
  PalletNftsDestroyWitness: {
    items: string;
    itemMetadatas: string;
    attributes: string;
  };
  /**
   * Lookup326: pallet_nfts::types::MintWitness<ItemId>
   **/
  PalletNftsMintWitness: {
    ownerOfItem: string;
  };
  /**
   * Lookup327: pallet_nfts::types::ItemConfig
   **/
  PalletNftsItemConfig: {
    settings: string;
  };
  /**
   * Lookup328: pallet_nfts::types::CancelAttributesApprovalWitness
   **/
  PalletNftsCancelAttributesApprovalWitness: {
    accountAttributes: string;
  };
  /**
   * Lookup330: pallet_nfts::types::ItemTip<CollectionId, ItemId, sp_core::crypto::AccountId32, Amount>
   **/
  PalletNftsItemTip: {
    collection: string;
    item: string;
    receiver: string;
    amount: string;
  };
  /**
   * Lookup332: pallet_nfts::types::PreSignedMint<CollectionId, ItemId, sp_core::crypto::AccountId32, Deadline>
   **/
  PalletNftsPreSignedMint: {
    collection: string;
    item: string;
    attributes: string;
    metadata: string;
    onlyAccount: string;
    deadline: string;
  };
  /**
   * Lookup333: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: string;
      Sr25519: string;
      Ecdsa: string;
    };
  };
  /**
   * Lookup334: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: string;
  /**
   * Lookup336: pallet_transaction_storage::pallet::Call<T>
   **/
  PalletTransactionStorageCall: {
    _enum: {
      store: {
        data: string;
      };
      renew: {
        block: string;
        index: string;
      };
      check_proof: {
        proof: string;
      };
    };
  };
  /**
   * Lookup337: sp_transaction_storage_proof::TransactionStorageProof
   **/
  SpTransactionStorageProofTransactionStorageProof: {
    chunk: string;
    proof: string;
  };
  /**
   * Lookup338: pallet_bags_list::pallet::Call<T, I>
   **/
  PalletBagsListCall: {
    _enum: {
      rebag: {
        dislocated: string;
      };
      put_in_front_of: {
        lighter: string;
      };
    };
  };
  /**
   * Lookup339: pallet_state_trie_migration::pallet::Call<T>
   **/
  PalletStateTrieMigrationCall: {
    _enum: {
      control_auto_migration: {
        maybeConfig: string;
      };
      continue_migrate: {
        limits: string;
        realSizeUpper: string;
        witnessTask: string;
      };
      migrate_custom_top: {
        _alias: {
          keys_: string;
        };
        keys_: string;
        witnessSize: string;
      };
      migrate_custom_child: {
        root: string;
        childKeys: string;
        totalSize: string;
      };
      set_signed_max_limits: {
        limits: string;
      };
      force_set_progress: {
        progressTop: string;
        progressChild: string;
      };
    };
  };
  /**
   * Lookup341: pallet_state_trie_migration::pallet::MigrationLimits
   **/
  PalletStateTrieMigrationMigrationLimits: {
    _alias: {
      size_: string;
    };
    size_: string;
    item: string;
  };
  /**
   * Lookup342: pallet_state_trie_migration::pallet::MigrationTask<T>
   **/
  PalletStateTrieMigrationMigrationTask: {
    _alias: {
      size_: string;
    };
    progressTop: string;
    progressChild: string;
    size_: string;
    topItems: string;
    childItems: string;
  };
  /**
   * Lookup343: pallet_state_trie_migration::pallet::Progress<MaxKeyLen>
   **/
  PalletStateTrieMigrationProgress: {
    _enum: {
      ToStart: string;
      LastKey: string;
      Complete: string;
    };
  };
  /**
   * Lookup345: pallet_child_bounties::pallet::Call<T>
   **/
  PalletChildBountiesCall: {
    _enum: {
      add_child_bounty: {
        parentBountyId: string;
        value: string;
        description: string;
      };
      propose_curator: {
        parentBountyId: string;
        childBountyId: string;
        curator: string;
        fee: string;
      };
      accept_curator: {
        parentBountyId: string;
        childBountyId: string;
      };
      unassign_curator: {
        parentBountyId: string;
        childBountyId: string;
      };
      award_child_bounty: {
        parentBountyId: string;
        childBountyId: string;
        beneficiary: string;
      };
      claim_child_bounty: {
        parentBountyId: string;
        childBountyId: string;
      };
      close_child_bounty: {
        parentBountyId: string;
        childBountyId: string;
      };
    };
  };
  /**
   * Lookup346: pallet_referenda::pallet::Call<T, I>
   **/
  PalletReferendaCall: {
    _enum: {
      submit: {
        proposalOrigin: string;
        proposal: string;
        enactmentMoment: string;
      };
      place_decision_deposit: {
        index: string;
      };
      refund_decision_deposit: {
        index: string;
      };
      cancel: {
        index: string;
      };
      kill: {
        index: string;
      };
      nudge_referendum: {
        index: string;
      };
      one_fewer_deciding: {
        track: string;
      };
      refund_submission_deposit: {
        index: string;
      };
      set_metadata: {
        index: string;
        maybeHash: string;
      };
    };
  };
  /**
   * Lookup347: frame_support::traits::schedule::DispatchTime<BlockNumber>
   **/
  FrameSupportScheduleDispatchTime: {
    _enum: {
      At: string;
      After: string;
    };
  };
  /**
   * Lookup348: pallet_remark::pallet::Call<T>
   **/
  PalletRemarkCall: {
    _enum: {
      store: {
        remark: string;
      };
    };
  };
  /**
   * Lookup349: pallet_root_testing::pallet::Call<T>
   **/
  PalletRootTestingCall: {
    _enum: {
      fill_block: {
        ratio: string;
      };
    };
  };
  /**
   * Lookup350: pallet_conviction_voting::pallet::Call<T, I>
   **/
  PalletConvictionVotingCall: {
    _enum: {
      vote: {
        pollIndex: string;
        vote: string;
      };
      delegate: {
        class: string;
        to: string;
        conviction: string;
        balance: string;
      };
      undelegate: {
        class: string;
      };
      unlock: {
        class: string;
        target: string;
      };
      remove_vote: {
        class: string;
        index: string;
      };
      remove_other_vote: {
        target: string;
        class: string;
        index: string;
      };
    };
  };
  /**
   * Lookup351: pallet_conviction_voting::vote::AccountVote<Balance>
   **/
  PalletConvictionVotingVoteAccountVote: {
    _enum: {
      Standard: {
        vote: string;
        balance: string;
      };
      Split: {
        aye: string;
        nay: string;
      };
      SplitAbstain: {
        aye: string;
        nay: string;
        abstain: string;
      };
    };
  };
  /**
   * Lookup353: pallet_conviction_voting::conviction::Conviction
   **/
  PalletConvictionVotingConviction: {
    _enum: string[];
  };
  /**
   * Lookup355: pallet_whitelist::pallet::Call<T>
   **/
  PalletWhitelistCall: {
    _enum: {
      whitelist_call: {
        callHash: string;
      };
      remove_whitelisted_call: {
        callHash: string;
      };
      dispatch_whitelisted_call: {
        callHash: string;
        callEncodedLen: string;
        callWeightWitness: string;
      };
      dispatch_whitelisted_call_with_preimage: {
        call: string;
      };
    };
  };
  /**
   * Lookup357: pallet_alliance::pallet::Call<T, I>
   **/
  PalletAllianceCall: {
    _enum: {
      propose: {
        threshold: string;
        proposal: string;
        lengthBound: string;
      };
      vote: {
        proposal: string;
        index: string;
        approve: string;
      };
      close_old_weight: {
        proposalHash: string;
        index: string;
        proposalWeightBound: string;
        lengthBound: string;
      };
      init_members: {
        fellows: string;
        allies: string;
      };
      disband: {
        witness: string;
      };
      set_rule: {
        rule: string;
      };
      announce: {
        announcement: string;
      };
      remove_announcement: {
        announcement: string;
      };
      join_alliance: string;
      nominate_ally: {
        who: string;
      };
      elevate_ally: {
        ally: string;
      };
      give_retirement_notice: string;
      retire: string;
      kick_member: {
        who: string;
      };
      add_unscrupulous_items: {
        items: string;
      };
      remove_unscrupulous_items: {
        items: string;
      };
      close: {
        proposalHash: string;
        index: string;
        proposalWeightBound: string;
        lengthBound: string;
      };
      abdicate_fellow_status: string;
    };
  };
  /**
   * Lookup358: pallet_alliance::types::DisbandWitness
   **/
  PalletAllianceDisbandWitness: {
    fellowMembers: string;
    allyMembers: string;
  };
  /**
   * Lookup359: pallet_alliance::types::Cid
   **/
  PalletAllianceCid: {
    _alias: {
      hash_: string;
    };
    version: string;
    codec: string;
    hash_: string;
  };
  /**
   * Lookup360: pallet_alliance::types::Version
   **/
  PalletAllianceVersion: {
    _enum: string[];
  };
  /**
   * Lookup361: pallet_alliance::types::Multihash
   **/
  PalletAllianceMultihash: {
    code: string;
    digest: string;
  };
  /**
   * Lookup364: pallet_alliance::UnscrupulousItem<sp_core::crypto::AccountId32, bounded_collections::bounded_vec::BoundedVec<T, S>>
   **/
  PalletAllianceUnscrupulousItem: {
    _enum: {
      AccountId: string;
      Website: string;
    };
  };
  /**
   * Lookup366: pallet_nomination_pools::pallet::Call<T>
   **/
  PalletNominationPoolsCall: {
    _enum: {
      join: {
        amount: string;
        poolId: string;
      };
      bond_extra: {
        extra: string;
      };
      claim_payout: string;
      unbond: {
        memberAccount: string;
        unbondingPoints: string;
      };
      pool_withdraw_unbonded: {
        poolId: string;
        numSlashingSpans: string;
      };
      withdraw_unbonded: {
        memberAccount: string;
        numSlashingSpans: string;
      };
      create: {
        amount: string;
        root: string;
        nominator: string;
        stateToggler: string;
      };
      create_with_pool_id: {
        amount: string;
        root: string;
        nominator: string;
        stateToggler: string;
        poolId: string;
      };
      nominate: {
        poolId: string;
        validators: string;
      };
      set_state: {
        poolId: string;
        state: string;
      };
      set_metadata: {
        poolId: string;
        metadata: string;
      };
      set_configs: {
        minJoinBond: string;
        minCreateBond: string;
        maxPools: string;
        maxMembers: string;
        maxMembersPerPool: string;
      };
      update_roles: {
        poolId: string;
        newRoot: string;
        newNominator: string;
        newStateToggler: string;
      };
      chill: {
        poolId: string;
      };
    };
  };
  /**
   * Lookup367: pallet_nomination_pools::BondExtra<Balance>
   **/
  PalletNominationPoolsBondExtra: {
    _enum: {
      FreeBalance: string;
      Rewards: string;
    };
  };
  /**
   * Lookup368: pallet_nomination_pools::PoolState
   **/
  PalletNominationPoolsPoolState: {
    _enum: string[];
  };
  /**
   * Lookup369: pallet_nomination_pools::ConfigOp<T>
   **/
  PalletNominationPoolsConfigOpU128: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup370: pallet_nomination_pools::ConfigOp<T>
   **/
  PalletNominationPoolsConfigOpU32: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup371: pallet_nomination_pools::ConfigOp<sp_core::crypto::AccountId32>
   **/
  PalletNominationPoolsConfigOpAccountId32: {
    _enum: {
      Noop: string;
      Set: string;
      Remove: string;
    };
  };
  /**
   * Lookup373: pallet_ranked_collective::pallet::Call<T, I>
   **/
  PalletRankedCollectiveCall: {
    _enum: {
      add_member: {
        who: string;
      };
      promote_member: {
        who: string;
      };
      demote_member: {
        who: string;
      };
      remove_member: {
        who: string;
        minRank: string;
      };
      vote: {
        poll: string;
        aye: string;
      };
      cleanup_poll: {
        pollIndex: string;
        max: string;
      };
    };
  };
  /**
   * Lookup374: pallet_fast_unstake::pallet::Call<T>
   **/
  PalletFastUnstakeCall: {
    _enum: {
      register_fast_unstake: string;
      deregister: string;
      control: {
        erasToCheck: string;
      };
    };
  };
  /**
   * Lookup375: pallet_message_queue::pallet::Call<T>
   **/
  PalletMessageQueueCall: {
    _enum: {
      reap_page: {
        messageOrigin: string;
        pageIndex: string;
      };
      execute_overweight: {
        messageOrigin: string;
        page: string;
        index: string;
        weightLimit: string;
      };
    };
  };
  /**
   * Lookup376: pallet_message_queue::mock_helpers::MessageOrigin
   **/
  PalletMessageQueueMockHelpersMessageOrigin: {
    _enum: {
      Here: string;
      There: string;
      Everywhere: string;
    };
  };
  /**
   * Lookup377: frame_benchmarking_pallet_pov::pallet::Call<T>
   **/
  FrameBenchmarkingPalletPovCall: {
    _enum: string[];
  };
  /**
   * Lookup379: pallet_conviction_voting::types::Tally<Votes, Total>
   **/
  PalletConvictionVotingTally: {
    ayes: string;
    nays: string;
    support: string;
  };
  /**
   * Lookup380: pallet_remark::pallet::Event<T>
   **/
  PalletRemarkEvent: {
    _enum: {
      Stored: {
        sender: string;
        contentHash: string;
      };
    };
  };
  /**
   * Lookup381: pallet_conviction_voting::pallet::Event<T, I>
   **/
  PalletConvictionVotingEvent: {
    _enum: {
      Delegated: string;
      Undelegated: string;
    };
  };
  /**
   * Lookup382: pallet_whitelist::pallet::Event<T>
   **/
  PalletWhitelistEvent: {
    _enum: {
      CallWhitelisted: {
        callHash: string;
      };
      WhitelistedCallRemoved: {
        callHash: string;
      };
      WhitelistedCallDispatched: {
        callHash: string;
        result: string;
      };
    };
  };
  /**
   * Lookup384: frame_support::dispatch::PostDispatchInfo
   **/
  FrameSupportDispatchPostDispatchInfo: {
    actualWeight: string;
    paysFee: string;
  };
  /**
   * Lookup386: sp_runtime::DispatchErrorWithPostInfo<frame_support::dispatch::PostDispatchInfo>
   **/
  SpRuntimeDispatchErrorWithPostInfo: {
    postInfo: string;
    error: string;
  };
  /**
   * Lookup388: pallet_alliance::pallet::Event<T, I>
   **/
  PalletAllianceEvent: {
    _enum: {
      NewRuleSet: {
        rule: string;
      };
      Announced: {
        announcement: string;
      };
      AnnouncementRemoved: {
        announcement: string;
      };
      MembersInitialized: {
        fellows: string;
        allies: string;
      };
      NewAllyJoined: {
        ally: string;
        nominator: string;
        reserved: string;
      };
      AllyElevated: {
        ally: string;
      };
      MemberRetirementPeriodStarted: {
        member: string;
      };
      MemberRetired: {
        member: string;
        unreserved: string;
      };
      MemberKicked: {
        member: string;
        slashed: string;
      };
      UnscrupulousItemAdded: {
        items: string;
      };
      UnscrupulousItemRemoved: {
        items: string;
      };
      AllianceDisbanded: {
        fellowMembers: string;
        allyMembers: string;
        unreserved: string;
      };
      FellowAbdicated: {
        fellow: string;
      };
    };
  };
  /**
   * Lookup389: pallet_nomination_pools::pallet::Event<T>
   **/
  PalletNominationPoolsEvent: {
    _enum: {
      Created: {
        depositor: string;
        poolId: string;
      };
      Bonded: {
        member: string;
        poolId: string;
        bonded: string;
        joined: string;
      };
      PaidOut: {
        member: string;
        poolId: string;
        payout: string;
      };
      Unbonded: {
        member: string;
        poolId: string;
        balance: string;
        points: string;
        era: string;
      };
      Withdrawn: {
        member: string;
        poolId: string;
        balance: string;
        points: string;
      };
      Destroyed: {
        poolId: string;
      };
      StateChanged: {
        poolId: string;
        newState: string;
      };
      MemberRemoved: {
        poolId: string;
        member: string;
      };
      RolesUpdated: {
        root: string;
        stateToggler: string;
        nominator: string;
      };
      PoolSlashed: {
        poolId: string;
        balance: string;
      };
      UnbondingPoolSlashed: {
        poolId: string;
        era: string;
        balance: string;
      };
    };
  };
  /**
   * Lookup391: pallet_ranked_collective::Tally<T, I, M>
   **/
  PalletRankedCollectiveTally: {
    bareAyes: string;
    ayes: string;
    nays: string;
  };
  /**
   * Lookup392: pallet_ranked_collective::pallet::Event<T, I>
   **/
  PalletRankedCollectiveEvent: {
    _enum: {
      MemberAdded: {
        who: string;
      };
      RankChanged: {
        who: string;
        rank: string;
      };
      MemberRemoved: {
        who: string;
        rank: string;
      };
      Voted: {
        who: string;
        poll: string;
        vote: string;
        tally: string;
      };
    };
  };
  /**
   * Lookup393: pallet_ranked_collective::VoteRecord
   **/
  PalletRankedCollectiveVoteRecord: {
    _enum: {
      Aye: string;
      Nay: string;
    };
  };
  /**
   * Lookup394: pallet_fast_unstake::pallet::Event<T>
   **/
  PalletFastUnstakeEvent: {
    _enum: {
      Unstaked: {
        stash: string;
        result: string;
      };
      Slashed: {
        stash: string;
        amount: string;
      };
      InternalError: string;
      BatchChecked: {
        eras: string;
      };
      BatchFinished: {
        _alias: {
          size_: string;
        };
        size_: string;
      };
    };
  };
  /**
   * Lookup395: pallet_message_queue::pallet::Event<T>
   **/
  PalletMessageQueueEvent: {
    _enum: {
      Discarded: {
        _alias: {
          hash_: string;
        };
        hash_: string;
      };
      ProcessingFailed: {
        _alias: {
          hash_: string;
        };
        hash_: string;
        origin: string;
        error: string;
      };
      Processed: {
        _alias: {
          hash_: string;
        };
        hash_: string;
        origin: string;
        weightUsed: string;
        success: string;
      };
      OverweightEnqueued: {
        _alias: {
          hash_: string;
        };
        hash_: string;
        origin: string;
        pageIndex: string;
        messageIndex: string;
      };
      PageReaped: {
        origin: string;
        index: string;
      };
    };
  };
  /**
   * Lookup396: frame_support::traits::messages::ProcessMessageError
   **/
  FrameSupportMessagesProcessMessageError: {
    _enum: {
      BadFormat: string;
      Corrupt: string;
      Unsupported: string;
      Overweight: string;
    };
  };
  /**
   * Lookup397: frame_benchmarking_pallet_pov::pallet::Event<T>
   **/
  FrameBenchmarkingPalletPovEvent: {
    _enum: string[];
  };
  /**
   * Lookup398: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: string;
      Finalization: string;
      Initialization: string;
    };
  };
  /**
   * Lookup401: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: string;
    specName: string;
  };
  /**
   * Lookup403: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: string;
    maxBlock: string;
    perClass: string;
  };
  /**
   * Lookup404: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportDispatchPerDispatchClassWeightsPerClass: {
    normal: string;
    operational: string;
    mandatory: string;
  };
  /**
   * Lookup405: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: string;
    maxExtrinsic: string;
    maxTotal: string;
    reserved: string;
  };
  /**
   * Lookup406: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: string;
  };
  /**
   * Lookup407: frame_support::dispatch::PerDispatchClass<T>
   **/
  FrameSupportDispatchPerDispatchClassU32: {
    normal: string;
    operational: string;
    mandatory: string;
  };
  /**
   * Lookup408: sp_weights::RuntimeDbWeight
   **/
  SpWeightsRuntimeDbWeight: {
    read: string;
    write: string;
  };
  /**
   * Lookup409: sp_version::RuntimeVersion
   **/
  SpVersionRuntimeVersion: {
    specName: string;
    implName: string;
    authoringVersion: string;
    specVersion: string;
    implVersion: string;
    apis: string;
    transactionVersion: string;
    stateVersion: string;
  };
  /**
   * Lookup413: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: string[];
  };
  /**
   * Lookup414: pallet_utility::pallet::Error<T>
   **/
  PalletUtilityError: {
    _enum: string[];
  };
  /**
   * Lookup421: sp_consensus_babe::digests::PreDigest
   **/
  SpConsensusBabeDigestsPreDigest: {
    _enum: {
      __Unused0: string;
      Primary: string;
      SecondaryPlain: string;
      SecondaryVRF: string;
    };
  };
  /**
   * Lookup422: sp_consensus_babe::digests::PrimaryPreDigest
   **/
  SpConsensusBabeDigestsPrimaryPreDigest: {
    authorityIndex: string;
    slot: string;
    vrfOutput: string;
    vrfProof: string;
  };
  /**
   * Lookup423: sp_consensus_babe::digests::SecondaryPlainPreDigest
   **/
  SpConsensusBabeDigestsSecondaryPlainPreDigest: {
    authorityIndex: string;
    slot: string;
  };
  /**
   * Lookup424: sp_consensus_babe::digests::SecondaryVRFPreDigest
   **/
  SpConsensusBabeDigestsSecondaryVRFPreDigest: {
    authorityIndex: string;
    slot: string;
    vrfOutput: string;
    vrfProof: string;
  };
  /**
   * Lookup425: sp_consensus_babe::BabeEpochConfiguration
   **/
  SpConsensusBabeBabeEpochConfiguration: {
    c: string;
    allowedSlots: string;
  };
  /**
   * Lookup429: pallet_babe::pallet::Error<T>
   **/
  PalletBabeError: {
    _enum: string[];
  };
  /**
   * Lookup431: pallet_indices::pallet::Error<T>
   **/
  PalletIndicesError: {
    _enum: string[];
  };
  /**
   * Lookup433: pallet_balances::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: string;
    amount: string;
    reasons: string;
  };
  /**
   * Lookup434: pallet_balances::Reasons
   **/
  PalletBalancesReasons: {
    _enum: string[];
  };
  /**
   * Lookup437: pallet_balances::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: string;
    amount: string;
  };
  /**
   * Lookup439: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: string[];
  };
  /**
   * Lookup441: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: string[];
  };
  /**
   * Lookup442: pallet_election_provider_multi_phase::ReadySolution<T>
   **/
  PalletElectionProviderMultiPhaseReadySolution: {
    supports: string;
    score: string;
    compute: string;
  };
  /**
   * Lookup444: pallet_election_provider_multi_phase::RoundSnapshot<T>
   **/
  PalletElectionProviderMultiPhaseRoundSnapshot: {
    voters: string;
    targets: string;
  };
  /**
   * Lookup451: pallet_election_provider_multi_phase::signed::SignedSubmission<sp_core::crypto::AccountId32, Balance, kitchensink_runtime::NposSolution16>
   **/
  PalletElectionProviderMultiPhaseSignedSignedSubmission: {
    who: string;
    deposit: string;
    rawSolution: string;
    callFee: string;
  };
  /**
   * Lookup452: pallet_election_provider_multi_phase::pallet::Error<T>
   **/
  PalletElectionProviderMultiPhaseError: {
    _enum: string[];
  };
  /**
   * Lookup453: pallet_staking::StakingLedger<T>
   **/
  PalletStakingStakingLedger: {
    stash: string;
    total: string;
    active: string;
    unlocking: string;
    claimedRewards: string;
  };
  /**
   * Lookup455: pallet_staking::UnlockChunk<Balance>
   **/
  PalletStakingUnlockChunk: {
    value: string;
    era: string;
  };
  /**
   * Lookup458: pallet_staking::Nominations<T>
   **/
  PalletStakingNominations: {
    targets: string;
    submittedIn: string;
    suppressed: string;
  };
  /**
   * Lookup459: pallet_staking::ActiveEraInfo
   **/
  PalletStakingActiveEraInfo: {
    index: string;
    start: string;
  };
  /**
   * Lookup462: pallet_staking::EraRewardPoints<sp_core::crypto::AccountId32>
   **/
  PalletStakingEraRewardPoints: {
    total: string;
    individual: string;
  };
  /**
   * Lookup467: pallet_staking::UnappliedSlash<sp_core::crypto::AccountId32, Balance>
   **/
  PalletStakingUnappliedSlash: {
    validator: string;
    own: string;
    others: string;
    reporters: string;
    payout: string;
  };
  /**
   * Lookup469: pallet_staking::slashing::SlashingSpans
   **/
  PalletStakingSlashingSlashingSpans: {
    spanIndex: string;
    lastStart: string;
    lastNonzeroSlash: string;
    prior: string;
  };
  /**
   * Lookup470: pallet_staking::slashing::SpanRecord<Balance>
   **/
  PalletStakingSlashingSpanRecord: {
    slashed: string;
    paidOut: string;
  };
  /**
   * Lookup473: pallet_staking::pallet::pallet::Error<T>
   **/
  PalletStakingPalletError: {
    _enum: string[];
  };
  /**
   * Lookup477: sp_core::crypto::KeyTypeId
   **/
  SpCoreCryptoKeyTypeId: string;
  /**
   * Lookup478: pallet_session::pallet::Error<T>
   **/
  PalletSessionError: {
    _enum: string[];
  };
  /**
   * Lookup484: pallet_democracy::types::ReferendumInfo<BlockNumber, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance>
   **/
  PalletDemocracyReferendumInfo: {
    _enum: {
      Ongoing: string;
      Finished: {
        approved: string;
        end: string;
      };
    };
  };
  /**
   * Lookup485: pallet_democracy::types::ReferendumStatus<BlockNumber, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance>
   **/
  PalletDemocracyReferendumStatus: {
    end: string;
    proposal: string;
    threshold: string;
    delay: string;
    tally: string;
  };
  /**
   * Lookup486: pallet_democracy::types::Tally<Balance>
   **/
  PalletDemocracyTally: {
    ayes: string;
    nays: string;
    turnout: string;
  };
  /**
   * Lookup487: pallet_democracy::vote::Voting<Balance, sp_core::crypto::AccountId32, BlockNumber, MaxVotes>
   **/
  PalletDemocracyVoteVoting: {
    _enum: {
      Direct: {
        votes: string;
        delegations: string;
        prior: string;
      };
      Delegating: {
        balance: string;
        target: string;
        conviction: string;
        delegations: string;
        prior: string;
      };
    };
  };
  /**
   * Lookup491: pallet_democracy::types::Delegations<Balance>
   **/
  PalletDemocracyDelegations: {
    votes: string;
    capital: string;
  };
  /**
   * Lookup492: pallet_democracy::vote::PriorLock<BlockNumber, Balance>
   **/
  PalletDemocracyVotePriorLock: string;
  /**
   * Lookup495: pallet_democracy::pallet::Error<T>
   **/
  PalletDemocracyError: {
    _enum: string[];
  };
  /**
   * Lookup497: pallet_collective::Votes<sp_core::crypto::AccountId32, BlockNumber>
   **/
  PalletCollectiveVotes: {
    index: string;
    threshold: string;
    ayes: string;
    nays: string;
    end: string;
  };
  /**
   * Lookup498: pallet_collective::pallet::Error<T, I>
   **/
  PalletCollectiveError: {
    _enum: string[];
  };
  /**
   * Lookup502: pallet_elections_phragmen::SeatHolder<sp_core::crypto::AccountId32, Balance>
   **/
  PalletElectionsPhragmenSeatHolder: {
    who: string;
    stake: string;
    deposit: string;
  };
  /**
   * Lookup503: pallet_elections_phragmen::Voter<sp_core::crypto::AccountId32, Balance>
   **/
  PalletElectionsPhragmenVoter: {
    votes: string;
    stake: string;
    deposit: string;
  };
  /**
   * Lookup504: pallet_elections_phragmen::pallet::Error<T>
   **/
  PalletElectionsPhragmenError: {
    _enum: string[];
  };
  /**
   * Lookup506: pallet_membership::pallet::Error<T, I>
   **/
  PalletMembershipError: {
    _enum: string[];
  };
  /**
   * Lookup507: pallet_grandpa::StoredState<N>
   **/
  PalletGrandpaStoredState: {
    _enum: {
      Live: string;
      PendingPause: {
        scheduledAt: string;
        delay: string;
      };
      Paused: string;
      PendingResume: {
        scheduledAt: string;
        delay: string;
      };
    };
  };
  /**
   * Lookup508: pallet_grandpa::StoredPendingChange<N, Limit>
   **/
  PalletGrandpaStoredPendingChange: {
    scheduledAt: string;
    delay: string;
    nextAuthorities: string;
    forced: string;
  };
  /**
   * Lookup510: pallet_grandpa::pallet::Error<T>
   **/
  PalletGrandpaError: {
    _enum: string[];
  };
  /**
   * Lookup511: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
   **/
  PalletTreasuryProposal: {
    proposer: string;
    value: string;
    beneficiary: string;
    bond: string;
  };
  /**
   * Lookup514: frame_support::PalletId
   **/
  FrameSupportPalletId: string;
  /**
   * Lookup515: pallet_treasury::pallet::Error<T, I>
   **/
  PalletTreasuryError: {
    _enum: string[];
  };
  /**
   * Lookup517: pallet_contracts::wasm::PrefabWasmModule<T>
   **/
  PalletContractsWasmPrefabWasmModule: {
    instructionWeightsVersion: string;
    initial: string;
    maximum: string;
    code: string;
    determinism: string;
  };
  /**
   * Lookup519: pallet_contracts::wasm::OwnerInfo<T>
   **/
  PalletContractsWasmOwnerInfo: {
    owner: string;
    deposit: string;
    refcount: string;
  };
  /**
   * Lookup520: pallet_contracts::storage::ContractInfo<T>
   **/
  PalletContractsStorageContractInfo: {
    trieId: string;
    depositAccount: string;
    codeHash: string;
    storageBytes: string;
    storageItems: string;
    storageByteDeposit: string;
    storageItemDeposit: string;
    storageBaseDeposit: string;
  };
  /**
   * Lookup523: pallet_contracts::storage::DeletedContract
   **/
  PalletContractsStorageDeletedContract: {
    trieId: string;
  };
  /**
   * Lookup525: pallet_contracts::schedule::Schedule<T>
   **/
  PalletContractsSchedule: {
    limits: string;
    instructionWeights: string;
    hostFnWeights: string;
  };
  /**
   * Lookup526: pallet_contracts::schedule::Limits
   **/
  PalletContractsScheduleLimits: {
    eventTopics: string;
    globals: string;
    locals: string;
    parameters: string;
    memoryPages: string;
    tableSize: string;
    brTableSize: string;
    subjectLen: string;
    payloadLen: string;
  };
  /**
   * Lookup527: pallet_contracts::schedule::InstructionWeights<T>
   **/
  PalletContractsScheduleInstructionWeights: {
    _alias: {
      r_if: string;
    };
    version: string;
    fallback: string;
    i64const: string;
    i64load: string;
    i64store: string;
    select: string;
    r_if: string;
    br: string;
    brIf: string;
    brTable: string;
    brTablePerEntry: string;
    call: string;
    callIndirect: string;
    callIndirectPerParam: string;
    callPerLocal: string;
    localGet: string;
    localSet: string;
    localTee: string;
    globalGet: string;
    globalSet: string;
    memoryCurrent: string;
    memoryGrow: string;
    i64clz: string;
    i64ctz: string;
    i64popcnt: string;
    i64eqz: string;
    i64extendsi32: string;
    i64extendui32: string;
    i32wrapi64: string;
    i64eq: string;
    i64ne: string;
    i64lts: string;
    i64ltu: string;
    i64gts: string;
    i64gtu: string;
    i64les: string;
    i64leu: string;
    i64ges: string;
    i64geu: string;
    i64add: string;
    i64sub: string;
    i64mul: string;
    i64divs: string;
    i64divu: string;
    i64rems: string;
    i64remu: string;
    i64and: string;
    i64or: string;
    i64xor: string;
    i64shl: string;
    i64shrs: string;
    i64shru: string;
    i64rotl: string;
    i64rotr: string;
  };
  /**
   * Lookup528: pallet_contracts::schedule::HostFnWeights<T>
   **/
  PalletContractsScheduleHostFnWeights: {
    _alias: {
      r_return: string;
    };
    caller: string;
    isContract: string;
    codeHash: string;
    ownCodeHash: string;
    callerIsOrigin: string;
    address: string;
    gasLeft: string;
    balance: string;
    valueTransferred: string;
    minimumBalance: string;
    blockNumber: string;
    now: string;
    weightToFee: string;
    gas: string;
    input: string;
    inputPerByte: string;
    r_return: string;
    returnPerByte: string;
    terminate: string;
    random: string;
    depositEvent: string;
    depositEventPerTopic: string;
    depositEventPerByte: string;
    debugMessage: string;
    debugMessagePerByte: string;
    setStorage: string;
    setStoragePerNewByte: string;
    setStoragePerOldByte: string;
    setCodeHash: string;
    clearStorage: string;
    clearStoragePerByte: string;
    containsStorage: string;
    containsStoragePerByte: string;
    getStorage: string;
    getStoragePerByte: string;
    takeStorage: string;
    takeStoragePerByte: string;
    transfer: string;
    call: string;
    delegateCall: string;
    callTransferSurcharge: string;
    callPerClonedByte: string;
    instantiate: string;
    instantiateTransferSurcharge: string;
    instantiatePerInputByte: string;
    instantiatePerSaltByte: string;
    hashSha2256: string;
    hashSha2256PerByte: string;
    hashKeccak256: string;
    hashKeccak256PerByte: string;
    hashBlake2256: string;
    hashBlake2256PerByte: string;
    hashBlake2128: string;
    hashBlake2128PerByte: string;
    ecdsaRecover: string;
    ecdsaToEthAddress: string;
    reentranceCount: string;
    accountReentranceCount: string;
    instantiationNonce: string;
  };
  /**
   * Lookup529: pallet_contracts::pallet::Error<T>
   **/
  PalletContractsError: {
    _enum: string[];
  };
  /**
   * Lookup530: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: string[];
  };
  /**
   * Lookup534: pallet_im_online::BoundedOpaqueNetworkState<PeerIdEncodingLimit, MultiAddrEncodingLimit, AddressesLimit>
   **/
  PalletImOnlineBoundedOpaqueNetworkState: {
    peerId: string;
    externalAddresses: string;
  };
  /**
   * Lookup538: pallet_im_online::pallet::Error<T>
   **/
  PalletImOnlineError: {
    _enum: string[];
  };
  /**
   * Lookup541: sp_staking::offence::OffenceDetails<sp_core::crypto::AccountId32, Offender>
   **/
  SpStakingOffenceOffenceDetails: {
    offender: string;
    reporters: string;
  };
  /**
   * Lookup544: pallet_identity::types::Registration<Balance, MaxJudgements, MaxAdditionalFields>
   **/
  PalletIdentityRegistration: {
    judgements: string;
    deposit: string;
    info: string;
  };
  /**
   * Lookup552: pallet_identity::types::RegistrarInfo<Balance, sp_core::crypto::AccountId32>
   **/
  PalletIdentityRegistrarInfo: {
    account: string;
    fee: string;
    fields: string;
  };
  /**
   * Lookup554: pallet_identity::pallet::Error<T>
   **/
  PalletIdentityError: {
    _enum: string[];
  };
  /**
   * Lookup556: pallet_society::Bid<sp_core::crypto::AccountId32, Balance>
   **/
  PalletSocietyBid: {
    who: string;
    kind: string;
    value: string;
  };
  /**
   * Lookup557: pallet_society::BidKind<sp_core::crypto::AccountId32, Balance>
   **/
  PalletSocietyBidKind: {
    _enum: {
      Deposit: string;
      Vouch: string;
    };
  };
  /**
   * Lookup559: pallet_society::VouchingStatus
   **/
  PalletSocietyVouchingStatus: {
    _enum: string[];
  };
  /**
   * Lookup563: pallet_society::Vote
   **/
  PalletSocietyVote: {
    _enum: string[];
  };
  /**
   * Lookup564: pallet_society::pallet::Error<T, I>
   **/
  PalletSocietyError: {
    _enum: string[];
  };
  /**
   * Lookup565: pallet_recovery::RecoveryConfig<BlockNumber, Balance, bounded_collections::bounded_vec::BoundedVec<sp_core::crypto::AccountId32, S>>
   **/
  PalletRecoveryRecoveryConfig: {
    delayPeriod: string;
    deposit: string;
    friends: string;
    threshold: string;
  };
  /**
   * Lookup567: pallet_recovery::ActiveRecovery<BlockNumber, Balance, bounded_collections::bounded_vec::BoundedVec<sp_core::crypto::AccountId32, S>>
   **/
  PalletRecoveryActiveRecovery: {
    created: string;
    deposit: string;
    friends: string;
  };
  /**
   * Lookup568: pallet_recovery::pallet::Error<T>
   **/
  PalletRecoveryError: {
    _enum: string[];
  };
  /**
   * Lookup571: pallet_vesting::Releases
   **/
  PalletVestingReleases: {
    _enum: string[];
  };
  /**
   * Lookup572: pallet_vesting::pallet::Error<T>
   **/
  PalletVestingError: {
    _enum: string[];
  };
  /**
   * Lookup575: pallet_scheduler::Scheduled<Name, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, BlockNumber, kitchensink_runtime::OriginCaller, sp_core::crypto::AccountId32>
   **/
  PalletSchedulerScheduled: {
    maybeId: string;
    priority: string;
    call: string;
    maybePeriodic: string;
    origin: string;
  };
  /**
   * Lookup577: pallet_scheduler::pallet::Error<T>
   **/
  PalletSchedulerError: {
    _enum: string[];
  };
  /**
   * Lookup578: pallet_preimage::RequestStatus<sp_core::crypto::AccountId32, Balance>
   **/
  PalletPreimageRequestStatus: {
    _enum: {
      Unrequested: {
        deposit: string;
        len: string;
      };
      Requested: {
        deposit: string;
        count: string;
        len: string;
      };
    };
  };
  /**
   * Lookup582: pallet_preimage::pallet::Error<T>
   **/
  PalletPreimageError: {
    _enum: string[];
  };
  /**
   * Lookup585: pallet_proxy::ProxyDefinition<sp_core::crypto::AccountId32, kitchensink_runtime::ProxyType, BlockNumber>
   **/
  PalletProxyProxyDefinition: {
    delegate: string;
    proxyType: string;
    delay: string;
  };
  /**
   * Lookup589: pallet_proxy::Announcement<sp_core::crypto::AccountId32, primitive_types::H256, BlockNumber>
   **/
  PalletProxyAnnouncement: {
    real: string;
    callHash: string;
    height: string;
  };
  /**
   * Lookup591: pallet_proxy::pallet::Error<T>
   **/
  PalletProxyError: {
    _enum: string[];
  };
  /**
   * Lookup593: pallet_multisig::Multisig<BlockNumber, Balance, sp_core::crypto::AccountId32, MaxApprovals>
   **/
  PalletMultisigMultisig: {
    when: string;
    deposit: string;
    depositor: string;
    approvals: string;
  };
  /**
   * Lookup594: pallet_multisig::pallet::Error<T>
   **/
  PalletMultisigError: {
    _enum: string[];
  };
  /**
   * Lookup595: pallet_bounties::Bounty<sp_core::crypto::AccountId32, Balance, BlockNumber>
   **/
  PalletBountiesBounty: {
    proposer: string;
    value: string;
    fee: string;
    curatorDeposit: string;
    bond: string;
    status: string;
  };
  /**
   * Lookup596: pallet_bounties::BountyStatus<sp_core::crypto::AccountId32, BlockNumber>
   **/
  PalletBountiesBountyStatus: {
    _enum: {
      Proposed: string;
      Approved: string;
      Funded: string;
      CuratorProposed: {
        curator: string;
      };
      Active: {
        curator: string;
        updateDue: string;
      };
      PendingPayout: {
        curator: string;
        beneficiary: string;
        unlockAt: string;
      };
    };
  };
  /**
   * Lookup598: pallet_bounties::pallet::Error<T, I>
   **/
  PalletBountiesError: {
    _enum: string[];
  };
  /**
   * Lookup599: pallet_tips::OpenTip<sp_core::crypto::AccountId32, Balance, BlockNumber, primitive_types::H256>
   **/
  PalletTipsOpenTip: {
    reason: string;
    who: string;
    finder: string;
    deposit: string;
    closes: string;
    tips: string;
    findersFee: string;
  };
  /**
   * Lookup600: pallet_tips::pallet::Error<T, I>
   **/
  PalletTipsError: {
    _enum: string[];
  };
  /**
   * Lookup601: pallet_assets::types::AssetDetails<Balance, sp_core::crypto::AccountId32, DepositBalance>
   **/
  PalletAssetsAssetDetails: {
    owner: string;
    issuer: string;
    admin: string;
    freezer: string;
    supply: string;
    deposit: string;
    minBalance: string;
    isSufficient: string;
    accounts: string;
    sufficients: string;
    approvals: string;
    status: string;
  };
  /**
   * Lookup602: pallet_assets::types::AssetStatus
   **/
  PalletAssetsAssetStatus: {
    _enum: string[];
  };
  /**
   * Lookup603: pallet_assets::types::AssetAccount<Balance, DepositBalance, Extra>
   **/
  PalletAssetsAssetAccount: {
    balance: string;
    isFrozen: string;
    reason: string;
    extra: string;
  };
  /**
   * Lookup604: pallet_assets::types::ExistenceReason<Balance>
   **/
  PalletAssetsExistenceReason: {
    _enum: {
      Consumer: string;
      Sufficient: string;
      DepositHeld: string;
      DepositRefunded: string;
    };
  };
  /**
   * Lookup606: pallet_assets::types::Approval<Balance, DepositBalance>
   **/
  PalletAssetsApproval: {
    amount: string;
    deposit: string;
  };
  /**
   * Lookup607: pallet_assets::types::AssetMetadata<DepositBalance, bounded_collections::bounded_vec::BoundedVec<T, S>>
   **/
  PalletAssetsAssetMetadata: {
    deposit: string;
    name: string;
    symbol: string;
    decimals: string;
    isFrozen: string;
  };
  /**
   * Lookup608: pallet_assets::pallet::Error<T, I>
   **/
  PalletAssetsError: {
    _enum: string[];
  };
  /**
   * Lookup609: pallet_lottery::LotteryConfig<BlockNumber, Balance>
   **/
  PalletLotteryLotteryConfig: {
    price: string;
    start: string;
    length: string;
    delay: string;
    repeat: string;
  };
  /**
   * Lookup613: pallet_lottery::pallet::Error<T>
   **/
  PalletLotteryError: {
    _enum: string[];
  };
  /**
   * Lookup616: pallet_nis::pallet::Bid<Balance, sp_core::crypto::AccountId32>
   **/
  PalletNisBid: {
    amount: string;
    who: string;
  };
  /**
   * Lookup618: pallet_nis::pallet::SummaryRecord<BlockNumber, Balance>
   **/
  PalletNisSummaryRecord: {
    proportionOwed: string;
    index: string;
    thawed: string;
    lastPeriod: string;
    receiptsOnHold: string;
  };
  /**
   * Lookup619: pallet_nis::pallet::ReceiptRecord<sp_core::crypto::AccountId32, BlockNumber, Balance>
   **/
  PalletNisReceiptRecord: {
    proportion: string;
    owner: string;
    expiry: string;
  };
  /**
   * Lookup621: pallet_nis::pallet::Error<T>
   **/
  PalletNisError: {
    _enum: string[];
  };
  /**
   * Lookup622: pallet_uniques::types::CollectionDetails<sp_core::crypto::AccountId32, DepositBalance>
   **/
  PalletUniquesCollectionDetails: {
    owner: string;
    issuer: string;
    admin: string;
    freezer: string;
    totalDeposit: string;
    freeHolding: string;
    items: string;
    itemMetadatas: string;
    attributes: string;
    isFrozen: string;
  };
  /**
   * Lookup624: pallet_uniques::types::ItemDetails<sp_core::crypto::AccountId32, DepositBalance>
   **/
  PalletUniquesItemDetails: {
    owner: string;
    approved: string;
    isFrozen: string;
    deposit: string;
  };
  /**
   * Lookup625: pallet_uniques::types::CollectionMetadata<DepositBalance, StringLimit>
   **/
  PalletUniquesCollectionMetadata: {
    deposit: string;
    data: string;
    isFrozen: string;
  };
  /**
   * Lookup626: pallet_uniques::types::ItemMetadata<DepositBalance, StringLimit>
   **/
  PalletUniquesItemMetadata: {
    deposit: string;
    data: string;
    isFrozen: string;
  };
  /**
   * Lookup630: pallet_uniques::pallet::Error<T, I>
   **/
  PalletUniquesError: {
    _enum: string[];
  };
  /**
   * Lookup631: pallet_nfts::types::CollectionDetails<sp_core::crypto::AccountId32, DepositBalance>
   **/
  PalletNftsCollectionDetails: {
    owner: string;
    ownerDeposit: string;
    items: string;
    itemMetadatas: string;
    attributes: string;
  };
  /**
   * Lookup633: pallet_nfts::types::CollectionRole
   **/
  PalletNftsCollectionRole: {
    _enum: string[];
  };
  /**
   * Lookup634: pallet_nfts::types::ItemDetails<sp_core::crypto::AccountId32, pallet_nfts::types::ItemDeposit<DepositBalance, sp_core::crypto::AccountId32>, bounded_collections::bounded_btree_map::BoundedBTreeMap<sp_core::crypto::AccountId32, Option<T>, S>>
   **/
  PalletNftsItemDetails: {
    owner: string;
    approvals: string;
    deposit: string;
  };
  /**
   * Lookup635: pallet_nfts::types::ItemDeposit<DepositBalance, sp_core::crypto::AccountId32>
   **/
  PalletNftsItemDeposit: {
    account: string;
    amount: string;
  };
  /**
   * Lookup640: pallet_nfts::types::CollectionMetadata<Deposit, StringLimit>
   **/
  PalletNftsCollectionMetadata: {
    deposit: string;
    data: string;
  };
  /**
   * Lookup641: pallet_nfts::types::ItemMetadata<pallet_nfts::types::ItemMetadataDeposit<DepositBalance, sp_core::crypto::AccountId32>, StringLimit>
   **/
  PalletNftsItemMetadata: {
    deposit: string;
    data: string;
  };
  /**
   * Lookup642: pallet_nfts::types::ItemMetadataDeposit<DepositBalance, sp_core::crypto::AccountId32>
   **/
  PalletNftsItemMetadataDeposit: {
    account: string;
    amount: string;
  };
  /**
   * Lookup645: pallet_nfts::types::AttributeDeposit<DepositBalance, sp_core::crypto::AccountId32>
   **/
  PalletNftsAttributeDeposit: {
    account: string;
    amount: string;
  };
  /**
   * Lookup648: pallet_nfts::types::PendingSwap<CollectionId, ItemId, pallet_nfts::types::PriceWithDirection<Amount>, Deadline>
   **/
  PalletNftsPendingSwap: {
    desiredCollection: string;
    desiredItem: string;
    price: string;
    deadline: string;
  };
  /**
   * Lookup650: pallet_nfts::types::PalletFeature
   **/
  PalletNftsPalletFeature: {
    _enum: string[];
  };
  /**
   * Lookup651: pallet_nfts::pallet::Error<T, I>
   **/
  PalletNftsError: {
    _enum: string[];
  };
  /**
   * Lookup653: pallet_transaction_storage::TransactionInfo
   **/
  PalletTransactionStorageTransactionInfo: {
    _alias: {
      size_: string;
    };
    chunkRoot: string;
    contentHash: string;
    size_: string;
    blockChunks: string;
  };
  /**
   * Lookup655: pallet_transaction_storage::pallet::Error<T>
   **/
  PalletTransactionStorageError: {
    _enum: string[];
  };
  /**
   * Lookup656: pallet_bags_list::list::Node<T, I>
   **/
  PalletBagsListListNode: {
    id: string;
    prev: string;
    next: string;
    bagUpper: string;
    score: string;
  };
  /**
   * Lookup657: pallet_bags_list::list::Bag<T, I>
   **/
  PalletBagsListListBag: {
    head: string;
    tail: string;
  };
  /**
   * Lookup659: pallet_bags_list::pallet::Error<T, I>
   **/
  PalletBagsListError: {
    _enum: {
      List: string;
    };
  };
  /**
   * Lookup660: pallet_bags_list::list::ListError
   **/
  PalletBagsListListListError: {
    _enum: string[];
  };
  /**
   * Lookup661: pallet_child_bounties::ChildBounty<sp_core::crypto::AccountId32, Balance, BlockNumber>
   **/
  PalletChildBountiesChildBounty: {
    parentBounty: string;
    value: string;
    fee: string;
    curatorDeposit: string;
    status: string;
  };
  /**
   * Lookup662: pallet_child_bounties::ChildBountyStatus<sp_core::crypto::AccountId32, BlockNumber>
   **/
  PalletChildBountiesChildBountyStatus: {
    _enum: {
      Added: string;
      CuratorProposed: {
        curator: string;
      };
      Active: {
        curator: string;
      };
      PendingPayout: {
        curator: string;
        beneficiary: string;
        unlockAt: string;
      };
    };
  };
  /**
   * Lookup663: pallet_child_bounties::pallet::Error<T>
   **/
  PalletChildBountiesError: {
    _enum: string[];
  };
  /**
   * Lookup664: pallet_referenda::types::ReferendumInfo<TrackId, kitchensink_runtime::OriginCaller, Moment, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance, pallet_conviction_voting::types::Tally<Votes, Total>, sp_core::crypto::AccountId32, ScheduleAddress>
   **/
  PalletReferendaReferendumInfoConvictionVotingTally: {
    _enum: {
      Ongoing: string;
      Approved: string;
      Rejected: string;
      Cancelled: string;
      TimedOut: string;
      Killed: string;
    };
  };
  /**
   * Lookup665: pallet_referenda::types::ReferendumStatus<TrackId, kitchensink_runtime::OriginCaller, Moment, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance, pallet_conviction_voting::types::Tally<Votes, Total>, sp_core::crypto::AccountId32, ScheduleAddress>
   **/
  PalletReferendaReferendumStatusConvictionVotingTally: {
    track: string;
    origin: string;
    proposal: string;
    enactment: string;
    submitted: string;
    submissionDeposit: string;
    decisionDeposit: string;
    deciding: string;
    tally: string;
    inQueue: string;
    alarm: string;
  };
  /**
   * Lookup666: pallet_referenda::types::Deposit<sp_core::crypto::AccountId32, Balance>
   **/
  PalletReferendaDeposit: {
    who: string;
    amount: string;
  };
  /**
   * Lookup669: pallet_referenda::types::DecidingStatus<BlockNumber>
   **/
  PalletReferendaDecidingStatus: {
    since: string;
    confirming: string;
  };
  /**
   * Lookup675: pallet_referenda::types::TrackInfo<Balance, Moment>
   **/
  PalletReferendaTrackInfo: {
    name: string;
    maxDeciding: string;
    decisionDeposit: string;
    preparePeriod: string;
    decisionPeriod: string;
    confirmPeriod: string;
    minEnactmentPeriod: string;
    minApproval: string;
    minSupport: string;
  };
  /**
   * Lookup676: pallet_referenda::types::Curve
   **/
  PalletReferendaCurve: {
    _enum: {
      LinearDecreasing: {
        length: string;
        floor: string;
        ceil: string;
      };
      SteppedDecreasing: {
        begin: string;
        end: string;
        step: string;
        period: string;
      };
      Reciprocal: {
        factor: string;
        xOffset: string;
        yOffset: string;
      };
    };
  };
  /**
   * Lookup679: pallet_referenda::pallet::Error<T, I>
   **/
  PalletReferendaError: {
    _enum: string[];
  };
  /**
   * Lookup680: pallet_remark::pallet::Error<T>
   **/
  PalletRemarkError: {
    _enum: string[];
  };
  /**
   * Lookup682: pallet_conviction_voting::vote::Voting<Balance, sp_core::crypto::AccountId32, BlockNumber, PollIndex, MaxVotes>
   **/
  PalletConvictionVotingVoteVoting: {
    _enum: {
      Casting: string;
      Delegating: string;
    };
  };
  /**
   * Lookup683: pallet_conviction_voting::vote::Casting<Balance, BlockNumber, PollIndex, MaxVotes>
   **/
  PalletConvictionVotingVoteCasting: {
    votes: string;
    delegations: string;
    prior: string;
  };
  /**
   * Lookup687: pallet_conviction_voting::types::Delegations<Balance>
   **/
  PalletConvictionVotingDelegations: {
    votes: string;
    capital: string;
  };
  /**
   * Lookup688: pallet_conviction_voting::vote::PriorLock<BlockNumber, Balance>
   **/
  PalletConvictionVotingVotePriorLock: string;
  /**
   * Lookup689: pallet_conviction_voting::vote::Delegating<Balance, sp_core::crypto::AccountId32, BlockNumber>
   **/
  PalletConvictionVotingVoteDelegating: {
    balance: string;
    target: string;
    conviction: string;
    delegations: string;
    prior: string;
  };
  /**
   * Lookup693: pallet_conviction_voting::pallet::Error<T, I>
   **/
  PalletConvictionVotingError: {
    _enum: string[];
  };
  /**
   * Lookup694: pallet_whitelist::pallet::Error<T>
   **/
  PalletWhitelistError: {
    _enum: string[];
  };
  /**
   * Lookup699: pallet_alliance::MemberRole
   **/
  PalletAllianceMemberRole: {
    _enum: string[];
  };
  /**
   * Lookup703: pallet_alliance::pallet::Error<T, I>
   **/
  PalletAllianceError: {
    _enum: string[];
  };
  /**
   * Lookup704: pallet_nomination_pools::PoolMember<T>
   **/
  PalletNominationPoolsPoolMember: {
    poolId: string;
    points: string;
    lastRecordedRewardCounter: string;
    unbondingEras: string;
  };
  /**
   * Lookup707: pallet_nomination_pools::BondedPoolInner<T>
   **/
  PalletNominationPoolsBondedPoolInner: {
    points: string;
    state: string;
    memberCounter: string;
    roles: string;
  };
  /**
   * Lookup708: pallet_nomination_pools::PoolRoles<sp_core::crypto::AccountId32>
   **/
  PalletNominationPoolsPoolRoles: {
    depositor: string;
    root: string;
    nominator: string;
    stateToggler: string;
  };
  /**
   * Lookup709: pallet_nomination_pools::RewardPool<T>
   **/
  PalletNominationPoolsRewardPool: {
    lastRecordedRewardCounter: string;
    lastRecordedTotalPayouts: string;
    totalRewardsClaimed: string;
  };
  /**
   * Lookup710: pallet_nomination_pools::SubPools<T>
   **/
  PalletNominationPoolsSubPools: {
    noEra: string;
    withEra: string;
  };
  /**
   * Lookup711: pallet_nomination_pools::UnbondPool<T>
   **/
  PalletNominationPoolsUnbondPool: {
    points: string;
    balance: string;
  };
  /**
   * Lookup717: pallet_nomination_pools::pallet::Error<T>
   **/
  PalletNominationPoolsError: {
    _enum: {
      PoolNotFound: string;
      PoolMemberNotFound: string;
      RewardPoolNotFound: string;
      SubPoolsNotFound: string;
      AccountBelongsToOtherPool: string;
      FullyUnbonding: string;
      MaxUnbondingLimit: string;
      CannotWithdrawAny: string;
      MinimumBondNotMet: string;
      OverflowRisk: string;
      NotDestroying: string;
      NotNominator: string;
      NotKickerOrDestroying: string;
      NotOpen: string;
      MaxPools: string;
      MaxPoolMembers: string;
      CanNotChangeState: string;
      DoesNotHavePermission: string;
      MetadataExceedsMaxLen: string;
      Defensive: string;
      PartialUnbondNotAllowedPermissionlessly: string;
      PoolIdInUse: string;
      InvalidPoolId: string;
    };
  };
  /**
   * Lookup718: pallet_nomination_pools::pallet::DefensiveError
   **/
  PalletNominationPoolsDefensiveError: {
    _enum: string[];
  };
  /**
   * Lookup719: pallet_referenda::types::ReferendumInfo<TrackId, kitchensink_runtime::OriginCaller, Moment, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance, pallet_ranked_collective::Tally<T, I, M>, sp_core::crypto::AccountId32, ScheduleAddress>
   **/
  PalletReferendaReferendumInfoRankedCollectiveTally: {
    _enum: {
      Ongoing: string;
      Approved: string;
      Rejected: string;
      Cancelled: string;
      TimedOut: string;
      Killed: string;
    };
  };
  /**
   * Lookup720: pallet_referenda::types::ReferendumStatus<TrackId, kitchensink_runtime::OriginCaller, Moment, frame_support::traits::preimages::Bounded<kitchensink_runtime::RuntimeCall>, Balance, pallet_ranked_collective::Tally<T, I, M>, sp_core::crypto::AccountId32, ScheduleAddress>
   **/
  PalletReferendaReferendumStatusRankedCollectiveTally: {
    track: string;
    origin: string;
    proposal: string;
    enactment: string;
    submitted: string;
    submissionDeposit: string;
    decisionDeposit: string;
    deciding: string;
    tally: string;
    inQueue: string;
    alarm: string;
  };
  /**
   * Lookup723: pallet_ranked_collective::MemberRecord
   **/
  PalletRankedCollectiveMemberRecord: {
    rank: string;
  };
  /**
   * Lookup727: pallet_ranked_collective::pallet::Error<T, I>
   **/
  PalletRankedCollectiveError: {
    _enum: string[];
  };
  /**
   * Lookup728: pallet_fast_unstake::types::UnstakeRequest<T>
   **/
  PalletFastUnstakeUnstakeRequest: {
    stashes: string;
    checked: string;
  };
  /**
   * Lookup731: pallet_fast_unstake::pallet::Error<T>
   **/
  PalletFastUnstakeError: {
    _enum: string[];
  };
  /**
   * Lookup732: pallet_message_queue::BookState<pallet_message_queue::mock_helpers::MessageOrigin>
   **/
  PalletMessageQueueBookState: {
    _alias: {
      size_: string;
    };
    begin: string;
    end: string;
    count: string;
    readyNeighbours: string;
    messageCount: string;
    size_: string;
  };
  /**
   * Lookup734: pallet_message_queue::Neighbours<pallet_message_queue::mock_helpers::MessageOrigin>
   **/
  PalletMessageQueueNeighbours: {
    prev: string;
    next: string;
  };
  /**
   * Lookup736: pallet_message_queue::Page<Size, HeapSize>
   **/
  PalletMessageQueuePage: {
    remaining: string;
    remainingSize: string;
    firstIndex: string;
    first: string;
    last: string;
    heap: string;
  };
  /**
   * Lookup738: pallet_message_queue::pallet::Error<T>
   **/
  PalletMessageQueueError: {
    _enum: string[];
  };
  /**
   * Lookup742: frame_system::extensions::check_non_zero_sender::CheckNonZeroSender<T>
   **/
  FrameSystemExtensionsCheckNonZeroSender: string;
  /**
   * Lookup743: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: string;
  /**
   * Lookup744: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: string;
  /**
   * Lookup745: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: string;
  /**
   * Lookup748: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: string;
  /**
   * Lookup749: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: string;
  /**
   * Lookup750: pallet_asset_tx_payment::ChargeAssetTxPayment<T>
   **/
  PalletAssetTxPaymentChargeAssetTxPayment: {
    tip: string;
    assetId: string;
  };
  /**
   * Lookup751: kitchensink_runtime::Runtime
   **/
  KitchensinkRuntimeRuntime: string;
};
export default _default;
