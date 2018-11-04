import test from 'ava'
import * as React from 'react'
import { Simulate } from 'react-dom/test-utils'
import { createConnectedStore, Store } from '../../src'
import { withElement } from '../testUtils'

test('it should render', t => {
  let {Container, useStore} = createConnectedStore({ a: 1 })
  function B() {
    let store = useStore()
    return <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let A = () => <Container><B /></Container>

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })
})

test('it should update (with extra props)', t => {
  let {Container, useStore} = createConnectedStore({ a: 1 })
  type Props = {
    extra: string
    onChange(): void
  }
  function A() {
    let [extra, setExtra] = React.useState('a')
    return <Container>
      <B extra={extra} onChange={() => setExtra('b')} />
    </Container>
  }
  function B(props: Props) {
    let store = useStore()
    return <>
      <button onClick={() => props.onChange()}>
        {props.extra}
      </button>
      {store.get('a')}
    </>
  }

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, 'a')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, 'b')
  })
})

test('it should support multiple instances of a store', t => {
  let {Container, useStore} = createConnectedStore({ a: 1 })
  function C() {
    let store = useStore()
    return <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  withElement(A, a =>
    withElement(B, b => {
      t.is(a.querySelector('button')!.innerHTML, '1')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(a.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '1')
      Simulate.click(b.querySelector('button')!)
      t.is(a.querySelector('button')!.innerHTML, '2')
      t.is(b.querySelector('button')!.innerHTML, '2')
    })
  )
})

test('it should support multiple instances of a store, with non-overlapping lifecycles', t => {
  let {Container, useStore} = createConnectedStore({ a: 1 })
  let C = () => {
    let store = useStore()
    return <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  withElement(A, a => {
    t.is(a.querySelector('button')!.innerHTML, '1')
    Simulate.click(a.querySelector('button')!)
    t.is(a.querySelector('button')!.innerHTML, '2')
  })

  withElement(B, b => {
    t.is(b.querySelector('button')!.innerHTML, '1')
    Simulate.click(b.querySelector('button')!)
    t.is(b.querySelector('button')!.innerHTML, '2')
  })
})

test('it should support multiple instances of a store in one tree, with non-overlapping lifecycles', t => {
  let Test = createConnectedStore({ isA: true })
  let {Container, useStore} = createConnectedStore({ a: 1 })
  let C = () => {
    let store = useStore()
    return <button id='C' onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let A = () => <Container><C /></Container>
  let B = () => <Container><C /></Container>

  let D = () => {
    let store = Test.useStore()
    return <>
      {store.get('isA') ? <A /> : <B />}
      <button id='D' onClick={() => store.set('isA')(!store.get('isA'))} />
    </>
  }
  let E = () => <Test.Container><D /></Test.Container>

  withElement(E, e => {
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')

    // Swap subtree
    Simulate.click(e.querySelector('#D')!)
    t.is(e.querySelector('#C')!.innerHTML, '1')
    Simulate.click(e.querySelector('#C')!)
    t.is(e.querySelector('#C')!.innerHTML, '2')
  })
})

test('it should support interleaved stores', t => {
  let A = createConnectedStore({ a: 1 })
  let B = createConnectedStore({ b: 1 })
  let C = () => {
    let store = A.useStore()
    return <button onClick={() => store.set('a')(store.get('a') + 1)}>
      {store.get('a')}
    </button>
  }
  let D = () => {
    let store = B.useStore()
    return <button onClick={() => store.set('b')(store.get('b') + 1)}>
      {store.get('b')}
    </button>
  }
  let X = () => <A.Container>
    <C />
    <B.Container>
      <D />
      <C />
    </B.Container>
  </A.Container>

  withElement(X, x => {
    assertButtons(x, 1, 1, 1)
    Simulate.click(x.querySelectorAll('button')[0])
    assertButtons(x, 2, 1, 2)
    Simulate.click(x.querySelectorAll('button')[1])
    assertButtons(x, 2, 2, 2)
    Simulate.click(x.querySelectorAll('button')[2])
    assertButtons(x, 3, 2, 3)
  })

  function assertButtons(x: Element, one: number, two: number, three: number) {
    t.is(x.querySelectorAll('button')[0].innerHTML, one.toString())
    t.is(x.querySelectorAll('button')[1].innerHTML, two.toString())
    t.is(x.querySelectorAll('button')[2].innerHTML, three.toString())
  }
})

test('it should re-render if a used model property changed', t => {
  let renderCount = 0
  let store: Store<{a: number, b: number}>
  let S = createConnectedStore({
    a: 1,
    b: 1
  }, s => {
    store = s
    return s
  })
  let A = () => {
    renderCount++
    let store = S.useStore()
    return <>{store.get('a')}</>
  }
  let B = () => <S.Container><A /></S.Container>

  withElement(B, _ => {
    store.set('a')(2)
    store.set('a')(3)
    t.is(renderCount, 3)
  })
})
